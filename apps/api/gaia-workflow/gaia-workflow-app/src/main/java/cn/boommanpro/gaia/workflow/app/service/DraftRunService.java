package cn.boommanpro.gaia.workflow.app.service;

import cn.boommanpro.gaia.workflow.base.GaiaWorkflow;
import cn.hutool.json.JSONArray;
import cn.hutool.json.JSONObject;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;

/**
 * 会话草稿整流试跑 —— run(target=workflow) 与测试用例编排器共用的执行入口。
 *
 * <p>与 /api/execute 的异步任务不同，这里是 agent 工具语义：同步执行、60s 超时、
 * 返回 end 输出 + 每个节点的执行状态，模型据此定位哪一步没按预期走。</p>
 */
@Slf4j
@Service
public class DraftRunService {

    /**
     * 整流试跑同步等待上限。180s：一条带 5 个 LLM 节点的真实流程在平台默认模型上
     * 每节点 8~17 秒（2026-10-24 会话 b6e34195 实证），旧值 60s 必然超时且模型无从修复
     * （把剩余轮数耗在逐节点调试一个全局限制上）。
     */
    public static final long TIMEOUT_SECONDS = 180;

    private static final ExecutorService DRAFT_RUN_POOL = Executors.newCachedThreadPool(r -> {
        Thread t = new Thread(r, "draft-run");
        t.setDaemon(true);
        return t;
    });

    private final AgentModelConfigService modelConfigService;

    public DraftRunService(AgentModelConfigService modelConfigService) {
        this.modelConfigService = modelConfigService;
    }

    /** 一次试跑的结果：success=false 时 error/issues 说明原因，nodes/failedNodes 给定位线索 */
    public static class RunReport {
        public boolean success;
        public boolean timedOut;
        public String error;
        public List<String> issues;
        public Map<String, Object> outputs;
        public long timeCostMs;
        /** nodeId → {status, timeCostMs} */
        public JSONObject nodes = new JSONObject(true);
        /** 失败/异常完成的节点：{id, status, error, outputs} */
        public JSONArray failedNodes = new JSONArray();
        /** 没执行到的节点（分支未命中 / 上游失败）：id 列表 */
        public JSONArray notExecuted = new JSONArray();

        public JSONObject toJson() {
            JSONObject json = new JSONObject(true)
                .set("success", success)
                .set("timeCostMs", timeCostMs)
                .set("nodes", nodes)
                .set("failedNodes", failedNodes)
                .set("notExecuted", notExecuted);
            if (outputs != null) json.set("outputs", outputs);
            if (error != null) json.set("error", error);
            if (issues != null && !issues.isEmpty()) json.set("issues", issues);
            if (timedOut) json.set("timedOut", true);
            return json;
        }
    }

    /**
     * 执行一份草稿 DSL。先做业务字段预检（空 url / 无 prompt 等毫秒级拦住），
     * 再补 llm 节点缺失的平台凭证（前端建的节点已带凭证，这里只兜底），然后同步跑整图。
     */
    public RunReport run(JSONObject draft, JSONObject inputs) {
        RunReport report = new RunReport();
        if (draft == null || draft.getJSONArray("nodes") == null || draft.getJSONArray("nodes").isEmpty()) {
            report.error = "画布为空";
            return report;
        }
        List<String> issues = WorkflowDslCanonicalizer.businessFieldIssues(draft);
        // 图级门禁与 /api/task/run 同一道（NC-05：草稿、试跑、任务执行复用同一分层校验链）。
        // 缺了它，"start 到不了 end" 这类断链草稿会以 end 零入度孤立执行的方式假成功
        // （2026-10-25 C04 实证：end_1 从未接线，run 照样返回 outputs）。
        for (WorkflowDslValidator.Issue issue : WorkflowDslValidator.validate(draft)) {
            if ("error".equals(issue.getLevel())) {
                issues.add(issue.getMessage());
            }
        }
        if (!issues.isEmpty()) {
            report.issues = issues;
            report.error = "预检未通过: " + issues.get(0);
            return report;
        }
        JSONObject schema = new JSONObject(draft.toString());
        Map<String, Object> runInputs = inputs != null ? new HashMap<>(inputs) : new HashMap<>();
        applyStartDefaults(schema, runInputs);

        GaiaWorkflow[] holder = new GaiaWorkflow[1];
        long start = System.currentTimeMillis();
        CompletableFuture<Map<String, Object>> future = CompletableFuture.supplyAsync(() -> {
            GaiaWorkflow workflow = new GaiaWorkflow(schema.toString());
            holder[0] = workflow;
            return workflow.run(runInputs);
        }, DRAFT_RUN_POOL);
        try {
            report.outputs = future.get(TIMEOUT_SECONDS, TimeUnit.SECONDS);
            report.success = true;
        } catch (TimeoutException e) {
            future.cancel(true);
            report.timedOut = true;
            report.error = "执行超过 " + TIMEOUT_SECONDS + " 秒已中止：用 run(target=node) 逐节点定位慢的那一步（http 超时 / llm 响应慢）";
        } catch (ExecutionException e) {
            Throwable cause = e.getCause() != null ? e.getCause() : e;
            report.error = cause.getMessage() != null ? cause.getMessage() : cause.toString();
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            report.error = "执行被中断";
        }
        report.timeCostMs = System.currentTimeMillis() - start;
        collectNodeReports(holder[0], report);
        return report;
    }

    /** inputs 缺省时用 start.outputs.properties.*.default 填充，让裸 run 也能跑 */
    private static void applyStartDefaults(JSONObject schema, Map<String, Object> inputs) {
        JSONArray nodes = schema.getJSONArray("nodes");
        if (nodes == null) return;
        for (int i = 0; i < nodes.size(); i++) {
            JSONObject node = nodes.getJSONObject(i);
            if (!"start".equals(node.getStr("type"))) continue;
            JSONObject data = node.getJSONObject("data");
            JSONObject outputs = data != null ? data.getJSONObject("outputs") : null;
            JSONObject properties = outputs != null ? outputs.getJSONObject("properties") : null;
            if (properties == null) return;
            for (String name : properties.keySet()) {
                JSONObject prop = properties.getJSONObject(name);
                if (!inputs.containsKey(name) && prop != null && prop.get("default") != null) {
                    inputs.put(name, prop.get("default"));
                }
            }
            return;
        }
    }

    private static void collectNodeReports(GaiaWorkflow workflow, RunReport report) {
        if (workflow == null) return;
        Map<String, GaiaWorkflow.NodeReport> reports;
        try {
            reports = workflow.getNodeReports();
        } catch (Exception e) {
            log.debug("[draft-run] node reports unavailable: {}", e.getMessage());
            return;
        }
        for (Map.Entry<String, GaiaWorkflow.NodeReport> entry : reports.entrySet()) {
            GaiaWorkflow.NodeReport nr = entry.getValue();
            String status = nr.getStatus() != null ? nr.getStatus() : "UNKNOWN";
            report.nodes.set(entry.getKey(), new JSONObject(true)
                .set("status", status)
                .set("timeCostMs", nr.getTimeCost() != null ? nr.getTimeCost() : 0));
            switch (status) {
                case "FAILED":
                case "FINISHED_ABNORMAL": {
                    JSONObject failed = new JSONObject(true).set("id", entry.getKey()).set("status", status);
                    Object snapshot = nr.getSnapshots() != null && !nr.getSnapshots().isEmpty() ? nr.getSnapshots().get(0) : null;
                    if (snapshot instanceof Map) {
                        Map<?, ?> snap = (Map<?, ?>) snapshot;
                        if (snap.get("error") != null) failed.set("error", headline(snap.get("error")));
                        if (snap.get("outputs") != null) failed.set("outputs", snap.get("outputs"));
                    }
                    report.failedNodes.add(failed);
                    break;
                }
                case "READY":
                case "WAIT":
                case "SKIPPED":
                    report.notExecuted.add(entry.getKey());
                    break;
                default:
                    break;
            }
        }
    }

    /**
     * 节点错误只保留首行（异常消息），去掉 Java 堆栈与异常类名前缀：
     * 模型需要的是「Error: 缺少 orderId」这一句，二十行 at ... 只会淹没它。
     */
    static String headline(Object error) {
        String text = String.valueOf(error);
        int newline = text.indexOf('\n');
        if (newline > 0) {
            text = text.substring(0, newline);
        }
        text = text.trim();
        // "java.lang.RuntimeException: GraalJS 执行失败: ..." → 去掉首个 Java 异常类名
        if (text.matches("^[a-zA-Z_$][\\w$]*(\\.[a-zA-Z_$][\\w$]*)+(Exception|Error): .*")) {
            text = text.substring(text.indexOf(": ") + 2);
        }
        return text;
    }
}
