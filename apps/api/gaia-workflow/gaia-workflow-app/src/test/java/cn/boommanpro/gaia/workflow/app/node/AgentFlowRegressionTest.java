package cn.boommanpro.gaia.workflow.app.node;

import cn.boommanpro.gaia.workflow.base.GaiaWorkflow;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.HashMap;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

/**
 * 2026-10-17 E2E 复刻（agent 搭的判断包含工作流）：正反两例都必须产出 result。
 * 反例（不包含）此前 end/code 被静默 canceled——引擎边语义回归。
 */
@DisplayName("E2E 复刻：agent 搭的包含判断工作流（cond→code→end，双出边同目标）")
class AgentFlowRegressionTest extends AbstractNodeTest {

    private Map<String, Object> run(String inputText) {
        GaiaWorkflow wf = new GaiaWorkflow(loadWorkflowJson("condition-code-flow"));
        Map<String, Object> inputs = new HashMap<>();
        inputs.put("input_text", inputText);
        return wf.run(inputs);
    }

    @Test
    @DisplayName("正例：包含 gaia → result=命中")
    void positive() {
        Map<String, Object> result = run("hello gaia world");
        assertEquals("命中", result.get("result"), "正例输出: " + result);
    }

    @Test
    @DisplayName("反例：不包含 → result=未命中（不得 canceled 跳过）")
    void negative() {
        Map<String, Object> result = run("hello world");
        assertEquals("未命中", result.get("result"), "反例输出: " + result);
    }
}
