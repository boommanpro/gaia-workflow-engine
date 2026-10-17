package cn.boommanpro.gaia.workflow.app.agent.tool.impl;

import cn.boommanpro.gaia.workflow.app.agent.core.AgentRunContext;
import cn.boommanpro.gaia.workflow.app.agent.core.ExecutionSurface;
import cn.boommanpro.gaia.workflow.app.agent.session.SessionWorkflowDraftService;
import cn.boommanpro.gaia.workflow.app.agent.tool.ToolExecutor;
import cn.boommanpro.gaia.workflow.app.agent.tool.ToolResult;
import cn.boommanpro.gaia.workflow.app.domain.testrun.input.SingleNodeRunInput;
import cn.boommanpro.gaia.workflow.app.domain.testrun.output.SingleNodeRunOutput;
import cn.boommanpro.gaia.workflow.app.executor.SingleNodeExecutor;
import cn.boommanpro.gaia.workflow.app.service.DraftRunService;
import cn.boommanpro.gaia.workflow.app.service.WorkflowTestCaseOrchestrator;
import cn.boommanpro.gaia.workflow.infra.manage.entity.WorkflowTestCase;
import cn.hutool.json.JSONArray;
import cn.hutool.json.JSONObject;
import org.springframework.stereotype.Component;

import java.util.List;

/** run — 整流/单节点/测试用例（三合一执行入口） */
@Component
public class RunToolExecutor implements ToolExecutor {

    private final SessionWorkflowDraftService draftService;
    private final SingleNodeExecutor singleNodeExecutor;
    private final DraftRunService draftRunService;
    private final WorkflowTestCaseOrchestrator testCaseOrchestrator;

    public RunToolExecutor(SessionWorkflowDraftService draftService,
                           SingleNodeExecutor singleNodeExecutor,
                           DraftRunService draftRunService,
                           WorkflowTestCaseOrchestrator testCaseOrchestrator) {
        this.draftService = draftService;
        this.singleNodeExecutor = singleNodeExecutor;
        this.draftRunService = draftRunService;
        this.testCaseOrchestrator = testCaseOrchestrator;
    }

    @Override public String name() { return "run"; }
    @Override public ExecutionSurface surface() { return ExecutionSurface.BACKEND_ONLY; }
    @Override public String description() { return "执行（target=workflow/node/tests）"; }

    @Override
    public ToolResult execute(JSONObject args, AgentRunContext ctx) {
        String target = args.getStr("target", "workflow");
        switch (target) {
            case "node": return runNode(args, ctx);
            case "tests": return runTests(args, ctx);
            default: return runWorkflow(args, ctx);
        }
    }

    private ToolResult runNode(JSONObject args, AgentRunContext ctx) {
        String nodeId = args.getStr("nodeId");
        JSONObject node = draftService.getNode(ctx.getSessionKey(), nodeId);
        if (node == null) return ToolResult.notFound("节点 " + nodeId);
        draftRunService.fillLlmDefaults(node, null);
        SingleNodeRunInput input = new SingleNodeRunInput();
        input.setNode(node.toString());
        JSONObject mock = args.getJSONObject("mockInputs");
        input.setInputs(mock != null ? new java.util.HashMap<>(mock) : new java.util.HashMap<>());
        SingleNodeRunOutput out = singleNodeExecutor.execute(input);
        JSONObject payload = new JSONObject().set("nodeId", nodeId).set("success", out.isSuccess())
            .set("outputs", out.getOutputs()).set("timeCost", out.getTimeCost());
        if (!out.isSuccess()) payload.set("error", out.getError());
        return ToolResult.ok(payload.toString(), out.isSuccess() ? "节点试跑通过" : "节点试跑失败: " + out.getError());
    }

    /** 整流试跑：真正执行会话草稿（同步、60s 超时），回 end 输出 + 每节点状态 */
    private ToolResult runWorkflow(JSONObject args, AgentRunContext ctx) {
        JSONObject doc = draftService.publicDoc(ctx.getSessionKey());
        DraftRunService.RunReport report = draftRunService.run(doc, args.getJSONObject("inputs"));
        JSONObject payload = report.toJson();
        if (!report.success) {
            if (report.issues != null && !report.issues.isEmpty()) {
                payload.set("fixHint", "按 issues 逐项修复后重跑");
                return ToolResult.fail(payload.toString(), "预检: " + report.issues.get(0));
            }
            payload.set("hint", "看 failedNodes 的 error；用 run(target=node, nodeId, mockInputs) 复现那一步");
            return ToolResult.ok(payload.toString(), "整流试跑失败: " + report.error);
        }
        if (report.outputs == null || report.outputs.isEmpty()) {
            payload.set("hint", "工作流跑完但 end 没有产出：检查 end.inputsValues 的引用字段与分支出边是否命中");
            return ToolResult.ok(payload.toString(), "整流试跑完成，但没有输出");
        }
        payload.set("hint", "换一组反向输入再跑一次，正反都过再提醒用户保存");
        return ToolResult.ok(payload.toString(), "整流试跑通过（" + report.timeCostMs + "ms）");
    }

    private ToolResult runTests(JSONObject args, AgentRunContext ctx) {
        String nodeId = args.getStr("nodeId");
        String workflowCode = draftService.codeFor(ctx.getSessionKey());
        List<WorkflowTestCase> cases = testCaseOrchestrator.listCases(workflowCode, nodeId);
        if (cases.isEmpty()) return ToolResult.ok("{\"total\":0,\"hint\":\"无测试用例，用 test_case 先沉淀\"}", "无测试用例");
        String draft = draftService.publicDoc(ctx.getSessionKey()).toString();
        JSONArray results = new JSONArray();
        int passed = 0;
        for (WorkflowTestCase tc : cases) {
            if (tc.getEnabled() == null || tc.getEnabled() != 1) continue;
            var run = testCaseOrchestrator.runCase(tc, draft, "agent");
            boolean ok = "passed".equals(run.getStatus());
            if (ok) passed++;
            JSONObject item = new JSONObject().set("caseId", run.getCaseId()).set("name", tc.getName())
                .set("status", run.getStatus());
            if (!ok && run.getError() != null) item.set("error", run.getError());
            if (!ok && run.getAssertResultsJson() != null) item.set("asserts", cn.hutool.json.JSONUtil.parseArray(run.getAssertResultsJson()));
            results.add(item);
        }
        return ToolResult.ok(new JSONObject().set("total", results.size()).set("passed", passed)
            .set("results", results).toString(), passed + "/" + results.size() + " 通过");
    }
}
