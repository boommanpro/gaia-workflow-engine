package cn.boommanpro.gaia.workflow.app.agent.tool.impl;

import cn.boommanpro.gaia.workflow.app.agent.core.AgentRunContext;
import cn.boommanpro.gaia.workflow.app.agent.core.ExecutionSurface;
import cn.boommanpro.gaia.workflow.app.agent.session.SessionArtifactStore;
import cn.boommanpro.gaia.workflow.app.agent.session.SessionWorkflowDraftService;
import cn.boommanpro.gaia.workflow.app.agent.tool.ToolExecutor;
import cn.boommanpro.gaia.workflow.app.agent.tool.ToolResult;
import cn.boommanpro.gaia.workflow.app.domain.testrun.input.SingleNodeRunInput;
import cn.boommanpro.gaia.workflow.app.domain.testrun.input.TaskRunInput;
import cn.boommanpro.gaia.workflow.app.domain.testrun.output.SingleNodeRunOutput;
import cn.boommanpro.gaia.workflow.app.domain.testrun.output.TaskReportOutput;
import cn.boommanpro.gaia.workflow.app.domain.testrun.output.TaskRunOutput;
import cn.boommanpro.gaia.workflow.app.domain.testrun.output.TaskResultOutput;
import cn.boommanpro.gaia.workflow.app.service.WorkflowTaskService;
import cn.hutool.json.JSONObject;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

/**
 * 画布类工具的后端执行器 —— 把 AI 的画布操作搬到服务端文档上。
 *
 * <p>旧链路里 canvas 工具必须靠浏览器画布实例执行（{@code FrontendUiToolExecutor} 占位），
 * 窗口一关 AI 就没法改工作流。这里基于 {@link SessionWorkflowDraftService} 的服务端草稿
 * 实现同一套语义：addNode / updateNode / deleteNode / connect / disconnect / autoLayout
 * 直接改后端文档，每次变更广播 {@code document} 事件，所有订阅窗口实时重渲染。</p>
 *
 * <p>runWorkflow / runNode 复用既有 {@link WorkflowTaskService} 的执行引擎，
 * 因此「AI 运行工作流 / 试跑节点」也完全不需要浏览器在场。</p>
 */
@Slf4j
@Component
public class CanvasToolExecutor implements ToolExecutor {

    /** 运行工作流时的轮询上限（毫秒） */
    private static final long RUN_WORKFLOW_TIMEOUT_MS = 180_000;
    private static final long POLL_INTERVAL_MS = 500;

    private final SessionWorkflowDraftService draftService;
    private final WorkflowTaskService taskService;
    private final SessionArtifactStore artifactStore;

    public CanvasToolExecutor(SessionWorkflowDraftService draftService,
                              WorkflowTaskService taskService,
                              SessionArtifactStore artifactStore) {
        this.draftService = draftService;
        this.taskService = taskService;
        this.artifactStore = artifactStore;
    }

    @Override
    public String name() {
        return "canvas";
    }

    @Override
    public ExecutionSurface surface() {
        return ExecutionSurface.ANY;
    }

    @Override
    public String description() {
        return "画布操作：增删改节点、连线、自动布局、运行工作流/单节点（服务端执行）";
    }

    @Override
    public ToolResult execute(JSONObject args, AgentRunContext context) {
        String action = args.getStr("action");
        if (action == null || action.isEmpty()) {
            return ToolResult.fail("{\"error\":\"action is required\"}", "缺少 action 参数");
        }
        String sessionKey = context.getSessionKey();
        try {
            JSONObject result;
            switch (action) {
                case "addNode":
                    result = draftService.addNode(sessionKey, args);
                    break;
                case "updateNode":
                    result = draftService.updateNode(sessionKey, args);
                    break;
                case "deleteNode":
                    result = draftService.deleteNode(sessionKey, args.getStr("nodeId"));
                    break;
                case "connect":
                    result = draftService.connect(sessionKey, args);
                    break;
                case "disconnect":
                    result = draftService.disconnect(sessionKey, args);
                    break;
                case "autoLayout":
                    result = draftService.autoLayout(sessionKey);
                    break;
                case "runWorkflow":
                    return runWorkflow(sessionKey, args);
                case "runNode":
                    return runNode(sessionKey, args);
                case "nodeDetail":
                    result = nodeDetail(sessionKey, args.getStr("nodeId"));
                    break;
                case "availableVariables":
                    return ToolResult.ok(draftService.availableVariables(sessionKey).toString(),
                        "查询到可用变量");
                default:
                    return ToolResult.fail(
                        "{\"error\":\"unknown canvas action: " + action + "\"}", "不支持的画布操作");
            }
            // 结构性变更后：先落 workflow 产物（草稿持久化 + artifact 事件），再广播文档，
            // 让所有订阅窗口实时跟随（对话流里的画布活卡由此驱动）
            draftService.persistArtifact(sessionKey, "stable", null);
            draftService.emitDocument(context, sessionKey);
            return ToolResult.ok(result.toString(), "canvas." + action + " 已执行");
        } catch (Exception e) {
            log.warn("[tool:canvas] {} failed: {}", action, e.getMessage());
            return ToolResult.fail("{\"error\":\"" + e.getMessage() + "\"}", "画布操作失败");
        }
    }

    // ---------------- 运行类 ----------------

    private ToolResult runWorkflow(String sessionKey, JSONObject args) {
        String schema = draftService.get(sessionKey).toString();
        if (draftService.get(sessionKey).getJSONArray("nodes").isEmpty()) {
            return ToolResult.fail("{\"error\":\"workflow is empty, build nodes first\"}",
                "当前画布为空，请先构建节点");
        }
        JSONObject inputs = args.getJSONObject("inputs");
        TaskRunInput input = new TaskRunInput();
        input.setSchema(schema);
        input.setInputs(inputs != null ? inputs : new java.util.HashMap<>());

        TaskRunOutput runOutput = taskService.runWorkflow(input);
        String taskId = runOutput.getTaskID();

        long deadline = System.currentTimeMillis() + RUN_WORKFLOW_TIMEOUT_MS;
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
                JSONObject payload = new JSONObject()
                    .set("taskId", taskId)
                    .set("status", status)
                    .set("outputs", result != null && result.getOutputs() != null
                        ? result.getOutputs() : report.getOutputs())
                    .set("reports", report.getReports() != null ? report.getReports() : new java.util.HashMap<>());
                // 试运行证据：独立产物，可追溯（输入/输出/节点级报告）
                emitTestReport(sessionKey, "工作流试运行",
                    status + " · taskId " + taskId,
                    payload.set("kind", "runWorkflow").set("inputs", inputs != null ? inputs : new JSONObject()));
                return ToolResult.ok(payload.toString(), "工作流运行完成：" + status);
            }
        }
        return ToolResult.fail("{\"error\":\"workflow run timed out\"}", "工作流运行超时");
    }

    private ToolResult runNode(String sessionKey, JSONObject args) {
        String nodeId = args.getStr("nodeId");
        cn.hutool.json.JSONObject node = draftService.getNode(sessionKey, nodeId);
        if (node == null) {
            return ToolResult.fail("{\"error\":\"node not found: " + nodeId + "\"}", "节点不存在");
        }
        JSONObject inputs = args.getJSONObject("inputs");
        SingleNodeRunInput runInput = new SingleNodeRunInput();
        runInput.setNode(node.toString());
        runInput.setInputs(inputs != null ? inputs : new java.util.HashMap<>());

        SingleNodeRunOutput output = taskService.runSingleNode(runInput);
        JSONObject payload = new JSONObject()
            .set("success", output.isSuccess())
            .set("nodeType", output.getNodeType())
            .set("outputs", output.getOutputs())
            .set("executeResult", output.getExecuteResult())
            .set("timeCost", output.getTimeCost())
            .set("error", output.getError());
        emitTestReport(sessionKey, "节点试运行",
            (output.isSuccess() ? "成功" : "失败") + " · " + nodeId,
            payload.set("kind", "runNode").set("nodeId", nodeId)
                .set("inputs", inputs != null ? inputs : new JSONObject()));
        return ToolResult.ok(payload.toString(),
            output.isSuccess() ? "节点运行成功" : "节点运行失败");
    }

    /** 试运行证据落为 test_report 产物（失败只告警，不影响工具结果） */
    private void emitTestReport(String sessionKey, String title, String summary, JSONObject payload) {
        try {
            artifactStore.appendArtifact(sessionKey, null, SessionArtifactStore.TYPE_TEST_REPORT,
                "completed", title, summary, payload);
        } catch (Exception e) {
            log.warn("[tool:canvas] test_report artifact failed: {}", e.getMessage());
        }
    }

    private JSONObject nodeDetail(String sessionKey, String nodeId) {
        cn.hutool.json.JSONObject node = draftService.getNode(sessionKey, nodeId);
        return node != null ? node : new JSONObject().set("error", "node not found: " + nodeId);
    }
}
