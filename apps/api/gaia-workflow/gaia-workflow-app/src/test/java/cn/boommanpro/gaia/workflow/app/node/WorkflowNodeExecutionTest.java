package cn.boommanpro.gaia.workflow.app.node;

import cn.boommanpro.gaia.workflow.app.domain.testrun.input.SingleNodeRunInput;
import cn.boommanpro.gaia.workflow.app.domain.testrun.output.SingleNodeRunOutput;
import cn.boommanpro.gaia.workflow.app.executor.SingleNodeExecutor;
import cn.boommanpro.gaia.workflow.base.GaiaWorkflow;
import cn.boommanpro.gaia.workflow.infra.extend.node.ChainParserManager;
import cn.boommanpro.gaia.workflow.infra.extend.node.workflow.WorkflowNode;
import cn.hutool.json.JSONArray;
import cn.hutool.json.JSONObject;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.HashMap;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * workflow 节点（嵌套工作流）补完后的行为验证：
 * 此前 targetWorkflowSchema 硬编码空串、获取目标 schema 的代码被注释——节点永远报错。
 */
@DisplayName("workflow 节点：嵌套工作流执行")
class WorkflowNodeExecutionTest {

    @BeforeAll
    static void setUp() {
        new ChainParserManager().initParserMap();
        WorkflowNode.setSchemaResolver(id -> "sub_flow".equals(id) ? subFlowSchema() : null);
    }

    @AfterAll
    static void tearDown() {
        WorkflowNode.setSchemaResolver(null);
    }

    // ---------------- 构造工具 ----------------

    private static JSONObject position(int x) {
        return new JSONObject().set("position", new JSONObject().set("x", x).set("y", 0));
    }

    private static JSONObject edge(String from, String to) {
        return new JSONObject().set("sourceNodeID", from).set("targetNodeID", to);
    }

    private static JSONObject ref(String nodeId, String field) {
        return new JSONObject().set("type", "ref")
            .set("content", new JSONArray().set(nodeId).set(field));
    }

    private static JSONObject outputProperty(String type) {
        return new JSONObject().set("type", type);
    }

    private static JSONObject doc(JSONArray nodes, JSONArray edges) {
        return new JSONObject().set("nodes", nodes).set("edges", edges);
    }

    /** 子工作流：start(text) → code(js 大写) → end(upper) */
    private static String subFlowSchema() {
        JSONObject startData = new JSONObject()
            .set("outputs", new JSONObject().set("type", "object")
                .set("properties", new JSONObject().set("text", outputProperty("string"))));
        JSONObject codeData = new JSONObject()
            .set("script", new JSONObject().set("language", "javascript")
                .set("content", "var t = text == null ? \"\" : text.toString(); ({ result: t.toUpperCase() })"))
            .set("inputsValues", new JSONObject().set("text", ref("s0", "text")))
            .set("inputs", new JSONObject().set("type", "object")
                .set("properties", new JSONObject().set("text", outputProperty("string"))))
            .set("outputs", new JSONObject().set("type", "object")
                .set("properties", new JSONObject().set("result", outputProperty("string"))));
        JSONObject endData = new JSONObject()
            .set("inputsValues", new JSONObject().set("upper", ref("c0", "result")))
            .set("inputs", new JSONObject().set("type", "object")
                .set("properties", new JSONObject().set("upper", outputProperty("string"))));

        JSONArray nodes = new JSONArray()
            .set(new JSONObject().set("id", "s0").set("type", "start")
                .set("meta", position(0)).set("data", startData))
            .set(new JSONObject().set("id", "c0").set("type", "code")
                .set("meta", position(1)).set("data", codeData))
            .set(new JSONObject().set("id", "e0").set("type", "end")
                .set("meta", position(2)).set("data", endData));
        JSONArray edges = new JSONArray()
            .set(edge("s0", "c0"))
            .set(edge("c0", "e0"));
        return doc(nodes, edges).toString();
    }

    /** 父工作流：start(query) → workflow(sub_flow, text=ref query) → end(result=ref wf_0.upper) */
    private static String parentFlowSchema() {
        JSONObject startData = new JSONObject()
            .set("outputs", new JSONObject().set("type", "object")
                .set("properties", new JSONObject().set("query",
                    outputProperty("string").set("default", "gaia"))));
        JSONObject workflowData = new JSONObject()
            .set("workflowId", "sub_flow")
            .set("workflowName", "子流程")
            .set("inputsValues", new JSONObject().set("text", ref("start_0", "query")))
            .set("inputs", new JSONObject().set("type", "object")
                .set("properties", new JSONObject().set("text", outputProperty("string"))))
            .set("outputs", new JSONObject().set("type", "object")
                .set("properties", new JSONObject().set("upper", outputProperty("string"))));
        JSONObject endData = new JSONObject()
            .set("inputsValues", new JSONObject().set("result", ref("wf_0", "upper")))
            .set("inputs", new JSONObject().set("type", "object")
                .set("properties", new JSONObject().set("result", outputProperty("string"))));

        JSONArray nodes = new JSONArray()
            .set(new JSONObject().set("id", "start_0").set("type", "start")
                .set("meta", position(0)).set("data", startData))
            .set(new JSONObject().set("id", "wf_0").set("type", "workflow")
                .set("meta", position(1)).set("data", workflowData))
            .set(new JSONObject().set("id", "end_0").set("type", "end")
                .set("meta", position(2)).set("data", endData));
        JSONArray edges = new JSONArray()
            .set(edge("start_0", "wf_0"))
            .set(edge("wf_0", "end_0"));
        return doc(nodes, edges).toString();
    }

    // ---------------- 用例 ----------------

    @Test
    @DisplayName("嵌套工作流：父流程传参 → 子流程执行 → 输出回传")
    void nestedWorkflowExecutes() {
        GaiaWorkflow wf = new GaiaWorkflow(parentFlowSchema());
        Map<String, Object> result = wf.run(new HashMap<>());
        assertEquals("GAIA", result.get("result"), "子流程输出应回传到父流程 end");
    }

    @Test
    @DisplayName("目标工作流不存在 → 节点 FAILED 抛断整条链（新错误语义：不再吞 error 假成功）")
    void missingTargetWorkflowReportsError() {
        WorkflowNode.setSchemaResolver(id -> null);
        try {
            GaiaWorkflow wf = new GaiaWorkflow(parentFlowSchema());
            // 第一档 A：目标缺失必须失败上抛——旧行为 end 照跑、错误只藏在
            // 节点报告 error 字段里，工作流呈现"成功"
            assertThrows(cn.boommanpro.gaia.workflow.base.exception.ChainException.class,
                () -> wf.run(new HashMap<>()));
            // 失败节点与被跳过的下游在节点报告口径中仍可排查
            GaiaWorkflow.NodeReport report = wf.getNodeReports().get("wf_0");
            assertNotNull(report, "workflow 节点应有执行报告");
        } finally {
            WorkflowNode.setSchemaResolver(id -> "sub_flow".equals(id) ? subFlowSchema() : null);
        }
    }

    @Test
    @DisplayName("单节点试运行 workflow 节点：未注入 schema 解析器时优雅报错（2026-10-17 起支持单测）")
    void singleNodeWorkflowWithoutResolverFailsGracefully() {
        WorkflowNode.setSchemaResolver(null);
        try {
            SingleNodeExecutor executor = new SingleNodeExecutor();
            assertTrue(executor.isSupported("workflow"), "workflow 已支持单节点测试");
            SingleNodeRunInput input = new SingleNodeRunInput();
            input.setNode("{\"id\":\"wf_0\",\"type\":\"workflow\",\"data\":{\"workflowId\":\"sub_flow\"}}");
            SingleNodeRunOutput output = executor.execute(input);
            // 未注入解析器：要么执行器报错、要么节点内 catch 走 error 输出——不能静默成功
            assertTrue(!output.isSuccess()
                    || String.valueOf(output.getExecuteResult()).contains("解析器"),
                "未注入解析器应明确报错而不是静默成功: " + output);
        } finally {
            WorkflowNode.setSchemaResolver(id -> "sub_flow".equals(id) ? subFlowSchema() : null);
        }
    }

}
