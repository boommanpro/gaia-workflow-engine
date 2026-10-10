package cn.boommanpro.gaia.workflow.app.agent.tool.impl;

import cn.boommanpro.gaia.workflow.app.agent.core.AgentRunContext;
import cn.boommanpro.gaia.workflow.app.agent.core.ExecutionSurface;
import cn.boommanpro.gaia.workflow.app.agent.session.SessionArtifactStore;
import cn.boommanpro.gaia.workflow.app.agent.session.SessionWorkflowDraftService;
import cn.boommanpro.gaia.workflow.app.agent.tool.ToolErrorCode;
import cn.boommanpro.gaia.workflow.app.agent.tool.ToolExecutor;
import cn.boommanpro.gaia.workflow.app.agent.tool.ToolResult;
import cn.boommanpro.gaia.workflow.app.domain.testrun.input.TaskRunInput;
import cn.boommanpro.gaia.workflow.app.domain.testrun.output.TaskReportOutput;
import cn.boommanpro.gaia.workflow.app.domain.testrun.output.TaskRunOutput;
import cn.boommanpro.gaia.workflow.app.domain.testrun.output.TaskResultOutput;
import cn.boommanpro.gaia.workflow.app.service.WorkflowTaskService;
import cn.hutool.json.JSONObject;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

/**
 * run_workflow —— 执行会话草稿并等待终态（从 canvas 拆出的独立执行工具）。
 *
 * <p>执行语义（180s 轮询至终态）与 test_report 产物与旧 canvas.runWorkflow 一致；
 * 拆出来是因为「执行」与「编辑」是不同的失败域：超时参数、产物、策略都应独立演进。</p>
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
                JSONObject payload = new JSONObject()
                    .set("taskId", taskId)
                    .set("status", status)
                    .set("outputs", result != null && result.getOutputs() != null
                        ? result.getOutputs() : report.getOutputs())
                    .set("reports", report.getReports() != null ? report.getReports() : new java.util.HashMap<>());
                emitTestReport(sessionKey, "工作流试运行",
                    status + " · taskId " + taskId,
                    new JSONObject(payload.toString()).set("kind", "run_workflow")
                        .set("inputs", inputs != null ? inputs : new JSONObject()));
                boolean ok = "succeed".equalsIgnoreCase(status) || "success".equalsIgnoreCase(status);
                return new ToolResult(ok, payload.toString(), false,
                    "工作流运行完成：" + status, ok ? null : ToolErrorCode.EXEC_ERROR);
            }
        }
        return ToolResult.fail(new JSONObject()
                .set("error", "workflow run timed out after " + timeout + "ms")
                .set("taskId", taskId).toString(),
            "工作流运行超时", ToolErrorCode.TIMEOUT);
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
