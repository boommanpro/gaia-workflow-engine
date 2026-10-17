package cn.boommanpro.gaia.workflow.app.agent.tool.impl;

import cn.boommanpro.gaia.workflow.app.agent.core.AgentRunContext;
import cn.boommanpro.gaia.workflow.app.agent.core.ExecutionSurface;
import cn.boommanpro.gaia.workflow.app.agent.session.SessionWorkflowDraftService;
import cn.boommanpro.gaia.workflow.app.agent.tool.ToolExecutor;
import cn.boommanpro.gaia.workflow.app.agent.tool.ToolGroup;
import cn.boommanpro.gaia.workflow.app.agent.tool.ToolResult;
import cn.boommanpro.gaia.workflow.app.service.WorkflowTestCaseOrchestrator;
import cn.hutool.json.JSONArray;
import cn.hutool.json.JSONObject;
import org.springframework.stereotype.Component;

@Component
public class TestCaseToolExecutor implements ToolExecutor {
    private final SessionWorkflowDraftService draftService;
    private final WorkflowTestCaseOrchestrator orchestrator;

    public TestCaseToolExecutor(SessionWorkflowDraftService draftService, WorkflowTestCaseOrchestrator orchestrator) {
        this.draftService = draftService;
        this.orchestrator = orchestrator;
    }

    @Override public String name() { return "test_case"; }
    @Override public ToolGroup group() { return ToolGroup.WORKFLOW; }
    @Override public ExecutionSurface surface() { return ExecutionSurface.BACKEND_ONLY; }
    @Override public String description() { return "沉淀测试用例"; }

    @Override
    public ToolResult execute(JSONObject args, AgentRunContext context) {
        String sessionKey = context.getSessionKey();
        String name = args.getStr("name");
        JSONArray expected = args.getJSONArray("expected");
        if (name == null || name.trim().isEmpty() || expected == null || expected.isEmpty())
            return ToolResult.fail("{\"error\":\"需要 name 与 expected\"}", "参数不完整");
        String nodeId = args.getStr("nodeId");
        if (nodeId != null && draftService.getNode(sessionKey, nodeId) == null)
            return ToolResult.notFound("节点 " + nodeId);
        var testCase = orchestrator.createCase(
            draftService.codeFor(sessionKey),
            nodeId, name.trim(), args.getStr("description"),
            args.getJSONObject("inputs"), expected, "agent");
        return ToolResult.ok(new JSONObject().set("caseId", testCase.getId())
            .set("level", nodeId != null ? "node" : "workflow").toString(),
            "已创建用例 #" + testCase.getId());
    }
}
