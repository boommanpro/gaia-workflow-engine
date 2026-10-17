package cn.boommanpro.gaia.workflow.app.node;

import cn.boommanpro.gaia.workflow.app.executor.SingleNodeExecutor;
import cn.boommanpro.gaia.workflow.app.domain.testrun.input.SingleNodeRunInput;
import cn.boommanpro.gaia.workflow.app.domain.testrun.output.SingleNodeRunOutput;
import cn.boommanpro.gaia.workflow.base.GaiaWorkflow;
import cn.hutool.json.JSONUtil;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.HashMap;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * L2 执行语义测试：此前 branches/loop 只测了「能解析」，从未真实跑过——
 * 分支互斥语义、loop 子块迭代、break 控制流全是零覆盖（2026-10-16 盘点结论）。
 */
@DisplayName("L2 执行语义：branches / loop / 控制流")
class NodeExecutionL2Test extends AbstractNodeTest {

    private static Map<String, Object> inputs(String k, Object v) {
        Map<String, Object> m = new HashMap<>();
        m.put(k, v);
        return m;
    }

    // ---------- branches ----------

    @Test
    @DisplayName("branches：命中第一个分支走 if_flow，下游互斥")
    void branchesFirstMatch() {
        GaiaWorkflow wf = new GaiaWorkflow(loadWorkflowJson("branches-flow"));
        Map<String, Object> result = wf.run(inputs("query", "Hello Gaia Flow"));
        assertEquals("flow-branch", result.get("output"));
    }

    @Test
    @DisplayName("branches：跳过第一个命中第二个（互斥短路，不落入 else）")
    void branchesSecondMatch() {
        GaiaWorkflow wf = new GaiaWorkflow(loadWorkflowJson("branches-flow"));
        Map<String, Object> result = wf.run(inputs("query", "Gaia"));
        assertEquals("gaia-branch", result.get("output"));
    }

    @Test
    @DisplayName("branches：全不命中走 else 兜底")
    void branchesElse() {
        GaiaWorkflow wf = new GaiaWorkflow(loadWorkflowJson("branches-flow"));
        Map<String, Object> result = wf.run(inputs("query", "nothing matches"));
        assertEquals("else-branch", result.get("output"));
    }

    @Test
    @DisplayName("SingleNodeExecutor 支持 branches 独立试运行（2026-10-16 起放开）")
    void singleNodeBranches() {
        SingleNodeExecutor executor = new SingleNodeExecutor();
        assertTrue(executor.isSupported("branches"), "branches 应支持单节点测试");

        String branchesNode = loadNodeJson("branches").toString();
        SingleNodeRunInput input = new SingleNodeRunInput();
        input.setNode(branchesNode);
        Map<String, Object> memory = new HashMap<>();
        // fixture 的 branch_match 条件：start_0.query eq "Hello Flow."
        memory.put("start_0", Map.of("query", "Hello Flow."));
        input.setInputs(memory);

        SingleNodeRunOutput output = executor.execute(input);
        assertTrue(output.isSuccess(), "branches 单节点执行应成功: " + output.getError());
        Object outputs = output.getOutputs();
        assertNotNull(outputs);
        assertEquals(Boolean.TRUE, ((Map<?, ?>) outputs).get("branch_match"), "命中分支应输出 true: " + outputs);
    }

    // ---------- loop 真实子块迭代 ----------

    @Test
    @DisplayName("loop：真实子块迭代 3 次，loopOutputs 按次收集")
    void loopIteratesSubBlocks() {
        GaiaWorkflow wf = new GaiaWorkflow(loadWorkflowJson("loop-code-flow"));
        Map<String, Object> result = wf.run(new HashMap<>());
        assertNotNull(result, "loop 工作流应正常执行");
        Object output = result.get("output");
        assertTrue(output instanceof java.util.List, "end 输出应是收集数组: " + output);
        java.util.List<?> list = (java.util.List<?>) output;
        assertEquals(3, list.size(), "应迭代 3 次: " + list);
        assertTrue(list.contains("APPLE"), "code 子块应处理每项: " + list);
    }

    @Test
    @DisplayName("loop：break 控制流在命中当次迭代即中断（该次结果不收集，后续项不执行）")
    void loopBreakStopsIteration() {
        GaiaWorkflow wf = new GaiaWorkflow(loadWorkflowJson("loop-break-flow"));
        Map<String, Object> result = wf.run(new HashMap<>());
        assertNotNull(result);
        java.util.List<?> list = (java.util.List<?>) result.get("output");
        // 引擎语义：banana 命中 break 时当次迭代的 collectOutputs 不执行，cherry 不再迭代
        assertEquals(1, list.size(), "只有 apple 完成收集: " + list);
        assertTrue(list.contains("APPLE"));
        assertFalse(list.contains("CHERRY"), "break 后 cherry 不应执行");
    }

    @Test
    @DisplayName("loop：maxLoopCount 限制迭代上限")
    void loopMaxCountLimits() {
        String schema = loadWorkflowJson("loop-code-flow");
        // 注入 maxLoopCount=2
        cn.hutool.json.JSONObject doc = JSONUtil.parseObj(schema);
        for (Object item : doc.getJSONArray("nodes")) {
            cn.hutool.json.JSONObject node = (cn.hutool.json.JSONObject) item;
            if ("loop".equals(node.getStr("type"))) {
                node.getJSONObject("data").set("maxLoopCount", 2);
            }
        }
        GaiaWorkflow wf = new GaiaWorkflow(doc.toString());
        Map<String, Object> result = wf.run(new HashMap<>());
        java.util.List<?> list = (java.util.List<?>) result.get("output");
        assertEquals(2, list.size(), "maxLoopCount=2 应只跑两次: " + list);
    }

    @Test
    @DisplayName("SingleNodeExecutor 拒绝非执行节点（画布标注类）且给出明确指引")
    void singleNodeRejectsAnnotationNodes() {
        SingleNodeExecutor executor = new SingleNodeExecutor();
        assertFalse(executor.isSupported("note"));
        assertFalse(executor.isSupported("group"));
        assertFalse(executor.isSupported("assignee"));
        assertFalse(executor.isSupported("multi-condition"));

        SingleNodeRunInput input = new SingleNodeRunInput();
        input.setNode("{\"id\":\"note_0\",\"type\":\"note\",\"data\":{\"title\":\"备注\"}}");
        SingleNodeRunOutput output = executor.execute(input);
        assertFalse(output.isSuccess());
        assertTrue(output.getError().contains("不参与执行"), "拒绝信息要可理解: " + output.getError());
    }

    @Test
    @DisplayName("SingleNodeExecutor 全量放开：loop 独立试跑（画布 toJSON 自带 blocks/edges）")
    void singleNodeLoop() {
        SingleNodeExecutor executor = new SingleNodeExecutor();
        assertTrue(executor.isSupported("loop"), "loop 应支持单节点测试");

        // 取 loop-code-flow fixture 里的 loop 节点（容器 toJSON：blocks/edges 内嵌，与画布一致）
        cn.hutool.json.JSONObject doc = cn.hutool.json.JSONUtil.parseObj(loadWorkflowJson("loop-code-flow"));
        cn.hutool.json.JSONObject loopNode = null;
        for (Object item : doc.getJSONArray("nodes")) {
            cn.hutool.json.JSONObject n = (cn.hutool.json.JSONObject) item;
            if ("loop".equals(n.getStr("type"))) {
                loopNode = n;
            }
        }
        assertNotNull(loopNode, "fixture 应包含 loop 节点");
        assertTrue(loopNode.containsKey("blocks"), "loop 节点 JSON 必须内嵌 blocks（画布容器序列化口径）");

        SingleNodeRunInput input = new SingleNodeRunInput();
        input.setNode(loopNode.toString());
        Map<String, Object> memory = new HashMap<>();
        // loopFor ref ["start_0","items"] 的模拟值：面板上由用户填数组
        memory.put("start_0", Map.of("items", java.util.List.of("apple", "banana")));
        input.setInputs(memory);

        SingleNodeRunOutput output = executor.execute(input);
        assertTrue(output.isSuccess(), "loop 单节点执行应成功: " + output.getError());
        Object processed = output.getOutputs().get("processed");
        assertTrue(processed instanceof java.util.List, "应输出收集数组: " + output.getOutputs());
        assertEquals(java.util.List.of("APPLE", "BANANA"), processed);
    }

    @Test
    @DisplayName("SingleNodeExecutor 全量放开：workflow 独立试跑（解析钩子加载子流程）")
    void singleNodeWorkflowNode() {
        SingleNodeExecutor executor = new SingleNodeExecutor();
        assertTrue(executor.isSupported("workflow"), "workflow 应支持单节点测试");

        String subFlow = new cn.hutool.json.JSONObject()
            .set("nodes", new cn.hutool.json.JSONArray()
                .set(new cn.hutool.json.JSONObject().set("id", "s0").set("type", "start")
                    .set("meta", new cn.hutool.json.JSONObject().set("position",
                        new cn.hutool.json.JSONObject().set("x", 0).set("y", 0)))
                    .set("data", new cn.hutool.json.JSONObject().set("outputs",
                        new cn.hutool.json.JSONObject().set("type", "object")
                            .set("properties", new cn.hutool.json.JSONObject()
                                .set("text", new cn.hutool.json.JSONObject().set("type", "string"))))))
                .set(new cn.hutool.json.JSONObject().set("id", "e0").set("type", "end")
                    .set("meta", new cn.hutool.json.JSONObject().set("position",
                        new cn.hutool.json.JSONObject().set("x", 1).set("y", 0)))
                    .set("data", new cn.hutool.json.JSONObject()
                        .set("inputsValues", new cn.hutool.json.JSONObject().set("upper",
                            new cn.hutool.json.JSONObject().set("type", "constant").set("content", "SUB-OK")))
                        .set("inputs", new cn.hutool.json.JSONObject().set("type", "object")
                            .set("properties", new cn.hutool.json.JSONObject()
                                .set("upper", new cn.hutool.json.JSONObject().set("type", "string")))))))
            .set("edges", new cn.hutool.json.JSONArray()
                .set(new cn.hutool.json.JSONObject().set("sourceNodeID", "s0").set("targetNodeID", "e0")))
            .toString();

        cn.boommanpro.gaia.workflow.infra.extend.node.workflow.WorkflowNode.setSchemaResolver(
            id -> "sub_flow".equals(id) ? subFlow : null);
        try {
            String workflowNodeJson = new cn.hutool.json.JSONObject()
                .set("id", "wf_0").set("type", "workflow")
                .set("data", new cn.hutool.json.JSONObject()
                    .set("workflowId", "sub_flow")
                    .set("inputs", new cn.hutool.json.JSONObject().set("type", "object")
                        .set("properties", new cn.hutool.json.JSONObject()))
                    .set("outputs", new cn.hutool.json.JSONObject().set("type", "object")
                        .set("properties", new cn.hutool.json.JSONObject()
                            .set("upper", new cn.hutool.json.JSONObject().set("type", "string")))))
                .toString();
            SingleNodeRunInput input = new SingleNodeRunInput();
            input.setNode(workflowNodeJson);
            input.setInputs(new HashMap<>());

            SingleNodeRunOutput output = executor.execute(input);
            assertTrue(output.isSuccess(), "workflow 单节点执行应成功: " + output.getError());
            assertEquals("SUB-OK", output.getOutputs().get("upper"), "子流程输出应回传");
        } finally {
            cn.boommanpro.gaia.workflow.infra.extend.node.workflow.WorkflowNode.setSchemaResolver(null);
        }
    }

    @Test
    @DisplayName("SingleNodeExecutor 全量放开：loop 内部控制节点可独立执行（回显控制标记）")
    void singleNodeControlNodes() {
        SingleNodeExecutor executor = new SingleNodeExecutor();
        assertTrue(executor.isSupported("break"));
        assertTrue(executor.isSupported("continue"));
        assertTrue(executor.isSupported("block-start"));
        assertTrue(executor.isSupported("block-end"));

        SingleNodeRunInput breakInput = new SingleNodeRunInput();
        breakInput.setNode("{\"id\":\"break_0\",\"type\":\"break\",\"data\":{}}");
        SingleNodeRunOutput breakOutput = executor.execute(breakInput);
        assertTrue(breakOutput.isSuccess(), "break 独立执行应成功: " + breakOutput.getError());

        SingleNodeRunInput blockEndInput = new SingleNodeRunInput();
        blockEndInput.setNode("{\"id\":\"block_end_0\",\"type\":\"block-end\",\"data\":{}}");
        SingleNodeRunOutput blockEndOutput = executor.execute(blockEndInput);
        assertTrue(blockEndOutput.isSuccess(), "block-end 独立执行应成功: " + blockEndOutput.getError());
    }
}
