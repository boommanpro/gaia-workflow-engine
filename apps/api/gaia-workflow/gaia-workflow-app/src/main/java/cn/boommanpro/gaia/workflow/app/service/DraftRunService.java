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

    public static final long TIMEOUT_SECONDS = 60;

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
        if (!issues.isEmpty()) {
            report.issues = issues;
            report.error = "预检未通过: " + issues.get(0);
            return report;
        }
        JSONObject schema = new JSONObject(draft.toString());
        fillLlmDefaults(schema);
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

    /** llm 节点凭证兜底：inputsValues / data 顶层缺 modelName/apiHost/apiKey 时填平台配置 */
    public void fillLlmDefaults(JSONObject schema) {
        JSONArray nodes = schema.getJSONArray("nodes");
        if (nodes == null) return;
        for (int i = 0; i < nodes.size(); i++) {
            fillLlmDefaults(nodes.getJSONObject(i), null);
        }
    }

    /** 单节点版（run(target=node) 复用）；llm 为空时懒加载平台配置 */
    public void fillLlmDefaults(JSONObject node, AgentModelConfigService.LlmConfig llm) {
        if (node == null || !"llm".equals(node.getStr("type"))) return;
        JSONObject data = node.getJSONObject("data");
        if (data == null) return;
        if (llm == null) {
            try { llm = modelConfigService.getLlmConfig(); } catch (Exception e) { return; }
            if (llm == null) return;
        }
        JSONObject iv = data.getJSONObject("inputsValues");
        if (iv != null) {
            fillConstant(iv, "modelName", llm.getModel());
            fillConstant(iv, "apiHost", llm.getApiHost());
            fillConstant(iv, "apiKey", llm.getApiKey());
        }
        if (data.get("modelName") == null) data.set("modelName", llm.getModel());
        if (data.get("apiHost") == null) data.set("apiHost", llm.getApiHost());
        if (data.get("apiKey") == null) data.set("apiKey", llm.getApiKey());
    }

    private static void fillConstant(JSONObject iv, String key, String value) {
        if (iv.get(key) == null && value != null) {
            iv.set(key, new JSONObject().set("type", "constant").set("content", value));
        }
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
                        if (snap.get("error") != null) failed.set("error", snap.get("error"));
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
}
