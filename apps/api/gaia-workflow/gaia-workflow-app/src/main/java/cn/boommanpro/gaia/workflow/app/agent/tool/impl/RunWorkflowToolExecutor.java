package cn.boommanpro.gaia.workflow.app.agent.tool.impl;

import cn.boommanpro.gaia.workflow.app.agent.core.AgentRunContext;
import cn.boommanpro.gaia.workflow.app.agent.core.ExecutionSurface;
import cn.boommanpro.gaia.workflow.app.agent.session.SessionArtifactStore;
import cn.boommanpro.gaia.workflow.app.agent.session.SessionWorkflowDraftService;
import cn.boommanpro.gaia.workflow.app.agent.tool.ToolErrorCode;
import cn.boommanpro.gaia.workflow.app.agent.tool.ToolExecutor;
import cn.boommanpro.gaia.workflow.app.agent.tool.ToolResult;
import cn.boommanpro.gaia.workflow.app.domain.testrun.input.TaskRunInput;
import cn.boommanpro.gaia.workflow.app.domain.testrun.model.NodeReport;
import cn.boommanpro.gaia.workflow.app.domain.testrun.model.Snapshot;
import cn.boommanpro.gaia.workflow.app.domain.testrun.output.TaskReportOutput;
import cn.boommanpro.gaia.workflow.app.domain.testrun.output.TaskRunOutput;
import cn.boommanpro.gaia.workflow.app.domain.testrun.output.TaskResultOutput;
import cn.boommanpro.gaia.workflow.app.service.WorkflowDslCanonicalizer;
import cn.boommanpro.gaia.workflow.app.service.WorkflowTaskService;
import cn.hutool.json.JSONArray;
import cn.hutool.json.JSONObject;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.Map;

/**
 * run_workflow —— 执行会话草稿并等待终态（从 canvas 拆出的独立执行工具）。
 *
 * <p>执行语义（180s 轮询至终态）与 test_report 产物与旧 canvas.runWorkflow 一致。
 * 失败经济性：① 执行前先做业务字段预检（空 url/prompt/script 毫秒级打回，修复 JSON 直接可抄），
 * 不再跑 30 秒才在节点执行器里炸；② 运行失败时回执首行给出「哪个节点、什么错、怎么修」，
 * 全量 reports 放在 payload 里供深挖（dsh 原则：错误第一行必须自足、可行动）。</p>
 */
@Slf4j
@Component
public class RunWorkflowToolExecutor implements ToolExecutor {

    private static final long DEFAULT_TIMEOUT_MS = 180_000;
    private static final long POLL_INTERVAL_MS = 500;

    private final SessionWorkflowDraftService draftService;
    private final WorkflowTaskService taskService;
    private final SessionArtifactStore artifactStore;

    public RunWorkflowToolExecutor(SessionWorkflowDraftService draftService,
                                   WorkflowTaskService taskService,
                                   SessionArtifactStore artifactStore) {
        this.draftService = draftService;
        this.taskService = taskService;
        this.artifactStore = artifactStore;
    }

    @Override
    public String name() {
        return "run_workflow";
    }

    @Override
    public ExecutionSurface surface() {
        return ExecutionSurface.BACKEND_ONLY;
    }

    @Override
    public String description() {
        return "试运行当前会话草稿的工作流，等待终态并返回输出";
    }

    @Override
    public ToolResult execute(JSONObject args, AgentRunContext context) {
        String sessionKey = context.getSessionKey();
        JSONObject doc = draftService.publicDoc(sessionKey);
        if (doc.getJSONArray("nodes") == null || doc.getJSONArray("nodes").isEmpty()) {
            return ToolResult.fail(new JSONObject().set("error", "当前画布为空，请先构建节点").toString(),
                "当前画布为空，请先构建节点", ToolErrorCode.INVALID_ARGS);
        }

        // 执行前预检：空 url/prompt/script 这类必然失败的配置，毫秒级打回（带可抄修复 JSON）
        java.util.List<String> issues = WorkflowDslCanonicalizer.businessFieldIssues(doc);
        if (!issues.isEmpty()) {
            JSONObject error = new JSONObject()
                .set("code", ToolErrorCode.INVALID_ARGS.name())
                .set("message", issues.get(0))
                .set("issues", issues);
            return ToolResult.fail(new JSONObject().set("error", error).toString(),
                "试运行未开始：" + issues.get(0), ToolErrorCode.INVALID_ARGS);
        }

        long timeout = args.getLong("timeoutMs") != null ? Math.min(args.getLong("timeoutMs"), 600_000)
            : DEFAULT_TIMEOUT_MS;

        JSONObject inputs = args.getJSONObject("inputs");
        TaskRunInput input = new TaskRunInput();
        input.setSchema(doc.toString());
        input.setInputs(inputs != null ? inputs : new java.util.HashMap<>());

        TaskRunOutput runOutput = taskService.runWorkflow(input);
        String taskId = runOutput.getTaskID();

        long deadline = System.currentTimeMillis() + timeout;
        while (System.currentTimeMillis() < deadline) {
            try {
                Thread.sleep(POLL_INTERVAL_MS);
            } catch (InterruptedException ie) {
                Thread.currentThread().interrupt();
                break;
            }
            TaskReportOutput report = taskService.getTaskReport(taskId);
            if (report.getWorkflowStatus() != null && report.getWorkflowStatus().isTerminated()) {
                TaskResultOutput result = taskService.getTaskResult(taskId);
                String status = report.getWorkflowStatus().getStatus();
                boolean ok = "succeed".equalsIgnoreCase(status) || "success".equalsIgnoreCase(status);

                JSONObject payload = new JSONObject()
                    .set("taskId", taskId)
                    .set("status", status);
                String message;
                if (ok) {
                    payload.set("outputs", result != null && result.getOutputs() != null
                            ? result.getOutputs() : report.getOutputs())
                        .set("reports", report.getReports() != null ? report.getReports() : new java.util.HashMap<>());
                    // 引擎对 canceled 连坐不报警（2026-10-11 实证：分支端口填错时 end 全部
                    // canceled 仍报 succeed，模型拿不到任何信号盲改 7 轮）。所有 end 都没执行
                    // = 工作流没有产出，必须在回执里点名，不能静默成功。
                    java.util.List<String> noOutput = endNotReachedWarnings(doc, report);
                    if (noOutput.isEmpty() && isEmptyMap(payload.get("outputs"))) {
                        // end 执行了但没值：inputsValues 的 ref 解析落空（引用字段不存在/上游没产出）
                        noOutput = new java.util.ArrayList<>();
                        noOutput.add("结束节点执行了但工作流输出为空：end 的 inputsValues 引用没有解析到值"
                            + "（检查 ref 的 [nodeId, field] 是否是上游真实产出，或上游节点没有输出该字段）。"
                            + "修复：read_node(end节点id) 核对引用后重跑");
                    }
                    if (noOutput.isEmpty()) {
                        // end 执行了、输出也有值，但声明的字段缺失 = 模型最困惑的「假完成」
                        //（2026-10-11 二轮实证：end ref code_1.result，code 脚本没返回该字段，
                        // 输出里永远没有 result，模型反复改 end 8 轮也不看上游）。点名到具体字段和上游。
                        noOutput = missingEndFieldWarnings(doc, report, payload.get("outputs"));
                    }
                    if (!noOutput.isEmpty()) {
                        payload.set("warnings", noOutput);
                        message = "工作流运行结束（" + status + "），但" + noOutput.get(0);
                    } else {
                        message = "工作流运行完成：" + status;
                    }
                } else {
                    // 失败回执：首行 = 哪个节点、什么错、怎么修；reports 全量放 payload
                    JSONArray failedNodes = failedNodesOf(report);
                    payload.set("failedNodes", failedNodes)
                        .set("outputs", result != null && result.getOutputs() != null
                            ? result.getOutputs() : new java.util.HashMap<>())
                        .set("reports", report.getReports() != null ? report.getReports() : new java.util.HashMap<>());
                    message = failureFirstLine(status, failedNodes);
                }

                emitTestReport(sessionKey, ok ? "工作流试运行" : "工作流试运行（失败）",
                    ok ? status + " · taskId " + taskId : message + " · taskId " + taskId,
                    new JSONObject(payload.toString()).set("kind", "run_workflow")
                        .set("inputs", inputs != null ? inputs : new JSONObject()));
                return new ToolResult(ok, payload.toString(), false,
                    message, ok ? null : ToolErrorCode.EXEC_ERROR);
            }
        }
        return ToolResult.fail(new JSONObject()
                .set("error", "workflow run timed out after " + timeout + "ms")
                .set("taskId", taskId).toString(),
            "工作流运行超时", ToolErrorCode.TIMEOUT);
    }

    /**
     * end 声明了输出字段但值缺失的点名：outputs 里没有 end 的 inputs.properties 声明字段时，
     * 顺着 inputsValues 的 ref 找上游节点，检查上游真实产出里有没有那个字段 —— 把
     * 「反复改 end 也不看上游」的空转直接掐断在第一轮。
     */
    static java.util.List<String> missingEndFieldWarnings(JSONObject doc, TaskReportOutput report, Object outputs) {
        java.util.List<String> warnings = new java.util.ArrayList<>();
        JSONArray nodes = doc.getJSONArray("nodes");
        Map<String, NodeReport> reports = report.getReports();
        if (nodes == null || reports == null || !(outputs instanceof Map)) {
            return warnings;
        }
        @SuppressWarnings("unchecked")
        Map<String, Object> outMap = (Map<String, Object>) outputs;
        for (int i = 0; i < nodes.size(); i++) {
            JSONObject n = nodes.getJSONObject(i);
            if (n == null || !"end".equals(n.getStr("type")) || n.getStr("id") == null) {
                continue;
            }
            NodeReport r = reports.get(n.getStr("id"));
            if (r == null || r.getStatus() == null
                || !("succeeded".equalsIgnoreCase(r.getStatus()) || "success".equalsIgnoreCase(r.getStatus()))) {
                continue;
            }
            JSONObject data = n.getJSONObject("data");
            if (data == null) {
                continue;
            }
            JSONObject inputsSchema = data.getJSONObject("inputs");
            JSONObject properties = inputsSchema == null ? null : inputsSchema.getJSONObject("properties");
            if (properties == null || properties.isEmpty()) {
                continue;
            }
            JSONObject inputsValues = data.getJSONObject("inputsValues");
            for (String field : properties.keySet()) {
                if (outMap.containsKey(field) && outMap.get(field) != null) {
                    continue;
                }
                StringBuilder sb = new StringBuilder("结束节点 ").append(n.getStr("id"))
                    .append(" 声明了输出字段 ").append(field).append("，但运行输出里没有这个字段的值");
                JSONObject ref = inputsValues == null ? null : inputsValues.getJSONObject(field);
                String upstreamNode = null;
                String upstreamField = null;
                if (ref != null && "ref".equals(ref.getStr("type")) && ref.getJSONArray("content") != null
                    && ref.getJSONArray("content").size() >= 2) {
                    upstreamNode = String.valueOf(ref.getJSONArray("content").get(0));
                    upstreamField = String.valueOf(ref.getJSONArray("content").get(1));
                    sb.append("（它引用 ").append(upstreamNode).append(".").append(upstreamField).append("）");
                }
                if (upstreamNode != null) {
                    NodeReport upstream = reports.get(upstreamNode);
                    Object upstreamOut = upstreamOutputOf(upstream, upstreamField);
                    if (upstreamOut == null) {
                        sb.append("。上游 ").append(upstreamNode).append(" 虽然执行成功，但没有产出字段 ")
                            .append(upstreamField).append(" ——问题在上游节点的配置，不在 end：")
                            .append("用 read_node(").append(upstreamNode)
                            .append(") 查看它的输出声明/脚本返回值，让上游真正产出该字段后再重跑");
                    }
                } else {
                    sb.append("。修复：read_node(").append(n.getStr("id"))
                        .append(") 核对 inputsValues 的引用，让 end 真正拿到上游值");
                }
                warnings.add(sb.toString());
            }
        }
        return warnings;
    }

    /** 上游节点 snapshot 的 outputs 里是否产出了指定字段（有任一 snapshot 含该字段即视为有） */
    private static Object upstreamOutputOf(NodeReport upstream, String field) {
        if (upstream == null || upstream.getSnapshots() == null) {
            return null;
        }
        for (Snapshot s : upstream.getSnapshots()) {
            if (s != null && s.getOutputs() != null && s.getOutputs().containsKey(field)) {
                Object v = s.getOutputs().get(field);
                if (v != null) {
                    return v;
                }
            }
        }
        return null;
    }

    private static boolean isEmptyMap(Object o) {
        if (o instanceof Map) {
            return ((Map<?, ?>) o).isEmpty();
        }
        return o == null;
    }

    /**
     * 「假成功」检测：引擎把 canceled 连坐算成功，但没有任何 end 节点执行过 =
     * 工作流没有产出（最常见根因是 condition/branches 出边 fromPort 填了 key 之外的值，
     * 引擎的端口匹配永远落空，分支下游整体 canceled）。部分 end canceled 属正常分支
     * 行为，只要有一个 end 成功就不警告。
     */
    static java.util.List<String> endNotReachedWarnings(JSONObject doc, TaskReportOutput report) {
        java.util.List<String> warnings = new java.util.ArrayList<>();
        JSONArray nodes = doc.getJSONArray("nodes");
        Map<String, NodeReport> reports = report.getReports();
        if (nodes == null || reports == null) {
            return warnings;
        }
        java.util.List<String> endIds = new java.util.ArrayList<>();
        for (int i = 0; i < nodes.size(); i++) {
            JSONObject n = nodes.getJSONObject(i);
            if (n != null && "end".equals(n.getStr("type")) && n.getStr("id") != null) {
                endIds.add(n.getStr("id"));
            }
        }
        if (endIds.isEmpty()) {
            return warnings;
        }
        boolean anyEndSucceeded = false;
        for (String endId : endIds) {
            NodeReport r = reports.get(endId);
            String st = r != null && r.getStatus() != null ? r.getStatus().toLowerCase() : "not_run";
            if ("succeeded".equals(st) || "success".equals(st)) {
                anyEndSucceeded = true;
            }
        }
        if (anyEndSucceeded) {
            return warnings;
        }
        StringBuilder sb = new StringBuilder("没有任何结束节点执行过（");
        for (int i = 0; i < endIds.size(); i++) {
            NodeReport r = reports.get(endIds.get(i));
            String st = r != null && r.getStatus() != null ? r.getStatus() : "not_run";
            sb.append(i > 0 ? "、" : "").append(endIds.get(i)).append("=").append(st);
        }
        sb.append("），工作流没有产出结果。最常见原因：condition/branches 出边的 fromPort ")
            .append("没有用条件的 key（或 else）——端口匹配不上时该分支下游全部不执行。")
            .append("修复：read_workflow 核对连到 end 的边，fromPort 改成 conditions[].key 或 else 后重跑");
        warnings.add(sb.toString());
        return warnings;
    }

    /** 失败节点清单：优先 status=failed/error 的（根因），其次 canceled（被连坐的下游） */    static JSONArray failedNodesOf(TaskReportOutput report) {
        JSONArray rootCauses = new JSONArray();
        JSONArray canceled = new JSONArray();
        Map<String, NodeReport> reports = report.getReports();
        if (reports == null) {
            return rootCauses;
        }
        for (Map.Entry<String, NodeReport> entry : reports.entrySet()) {
            NodeReport r = entry.getValue();
            if (r == null || r.getStatus() == null) {
                continue;
            }
            String st = r.getStatus().toLowerCase();
            if ("failed".equals(st) || "error".equals(st)) {
                rootCauses.add(new JSONObject()
                    .set("nodeId", entry.getKey())
                    .set("status", r.getStatus())
                    .set("reason", reasonOf(r)));
            } else if ("canceled".equals(st) && reasonOf(r) != null) {
                canceled.add(new JSONObject()
                    .set("nodeId", entry.getKey())
                    .set("status", r.getStatus())
                    .set("reason", reasonOf(r)));
            }
        }
        if (!rootCauses.isEmpty()) {
            return rootCauses;
        }
        return canceled;
    }

    /** 节点失败原因：snapshot.error 优先，其次 snapshot.data.error */
    private static String reasonOf(NodeReport report) {
        if (report.getSnapshots() == null) {
            return null;
        }
        for (Snapshot s : report.getSnapshots()) {
            if (s.getError() != null && !s.getError().isEmpty()) {
                return s.getError();
            }
            if (s.getData() instanceof Map) {
                Object err = ((Map<?, ?>) s.getData()).get("error");
                if (err != null && !String.valueOf(err).isEmpty()) {
                    return String.valueOf(err);
                }
            }
        }
        return null;
    }

    /** 失败回执首行：哪个节点、什么错、怎么修（自足，无需翻 reports） */
    static String failureFirstLine(String status, JSONArray failedNodes) {
        StringBuilder sb = new StringBuilder("工作流运行失败（").append(status).append("）：");
        if (failedNodes == null || failedNodes.isEmpty()) {
            return sb.append("没有节点级错误信息，用 payload.reports 逐节点排查").toString();
        }
        int shown = 0;
        for (int i = 0; i < failedNodes.size() && shown < 3; i++) {
            JSONObject node = failedNodes.getJSONObject(i);
            if (shown > 0) {
                sb.append("；");
            }
            sb.append("节点 ").append(node.getStr("nodeId"))
                .append(" — ").append(node.getStr("reason") != null ? node.getStr("reason") : node.getStr("status"));
            shown++;
        }
        if (failedNodes.size() > 3) {
            sb.append("（等共 ").append(failedNodes.size()).append(" 个节点，见 failedNodes）");
        }
        sb.append("。修复：先 read_node(节点ID) 看当前配置 → edit_workflow 修正 → 重新 run_workflow");
        return sb.toString();
    }

    /** 试运行证据落为 test_report 产物（失败只告警，不影响工具结果） */
    private void emitTestReport(String sessionKey, String title, String summary, JSONObject payload) {
        try {
            artifactStore.appendArtifact(sessionKey, null, SessionArtifactStore.TYPE_TEST_REPORT,
                "completed", title, summary, payload);
        } catch (Exception e) {
            log.warn("[tool:run_workflow] test_report artifact failed: {}", e.getMessage());
        }
    }
}
