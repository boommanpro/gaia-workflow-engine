package cn.boommanpro.gaia.workflow.app.agent.tool.impl;

import cn.boommanpro.gaia.workflow.app.agent.core.AgentRunContext;
import cn.boommanpro.gaia.workflow.app.agent.core.ExecutionSurface;
import cn.boommanpro.gaia.workflow.app.agent.session.SessionWorkflowDraftService;
import cn.boommanpro.gaia.workflow.app.agent.tool.ToolErrorCode;
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
        JSONObject inputs = args.getJSONObject("inputs");
        // 工作流级用例没有 inputs = start 入参全空 → 断言必然失败且原因隐蔽（2026-10-24 实证：
        // 模型两次建例都漏了 inputs，拿到 orderId 实际为空后无从定位）。当场拒绝并点名要填的字段
        if ((nodeId == null || nodeId.isEmpty()) && (inputs == null || inputs.isEmpty())) {
            return ToolResult.fail(new JSONObject()
                .set("error", "工作流级用例必须提供 inputs（start 节点的入参）：没有输入时所有入参为空，断言必然失败")
                .set("startInputs", startInputFields(sessionKey))
                .set("fixHint", "按 startInputs 给一组具体的输入值重新调用 test_case，如 {\"inputs\":{\"orderId\":\"ORD-1\",...}}")
                .toString(), "工作流级用例缺少 inputs", ToolErrorCode.INVALID_ARGS);
        }
        // 同名 upsert：模型复读「沉淀用例」不再堆重复项（2026-10-24 实证一轮 8 个重复用例）
        var upsert = orchestrator.upsertCase(
            draftService.codeFor(sessionKey),
            nodeId, name.trim(), args.getStr("description"),
            inputs, expected, "agent");
        var testCase = upsert.testCase;
        return ToolResult.ok(new JSONObject().set("caseId", testCase.getId())
            .set("level", nodeId != null ? "node" : "workflow")
            .set("updated", upsert.updated)
            .set("hint", upsert.updated
                ? "同名用例已覆盖更新（不会新建重复项）。接着 run(target=tests) 跑它"
                : "用例已创建。接着 run(target=tests)；若失败按 results[].failReason 修工作流或断言后再跑，不要重复创建").toString(),
            (upsert.updated ? "已更新同名用例 #" : "已创建用例 #") + testCase.getId());
    }

    /** 画布 start 节点声明的入参字段名（outputs.properties 的键），给缺 inputs 的拒绝回执当填写清单 */
    private JSONArray startInputFields(String sessionKey) {
        JSONArray fields = new JSONArray();
        try {
            JSONObject doc = draftService.publicDoc(sessionKey);
            JSONArray nodes = doc != null ? doc.getJSONArray("nodes") : null;
            if (nodes == null) return fields;
            for (int i = 0; i < nodes.size(); i++) {
                JSONObject node = nodes.getJSONObject(i);
                if (node == null || !"start".equals(node.getStr("type"))) continue;
                JSONObject data = node.getJSONObject("data");
                JSONObject outputs = data != null ? data.getJSONObject("outputs") : null;
                JSONObject props = outputs != null ? outputs.getJSONObject("properties") : null;
                if (props != null) fields.addAll(props.keySet());
            }
        } catch (Exception e) {
            // 清单只是辅助提示，取不到不影响拒绝本身
        }
        return fields;
    }
}
