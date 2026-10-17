package cn.boommanpro.gaia.workflow.app.node;

import cn.boommanpro.gaia.workflow.base.GaiaWorkflow;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.HashMap;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

/**
 * 引擎语义回归（2026-10-17 E2E 实证）：condition 的两条出边指向【同一个】目标节点
 * （if 端口 + else 端口都连到同一个 code/end）时，正反两条路径都必须真正执行下游。
 */
@DisplayName("引擎语义：condition 双端口边指向同一目标")
class ConditionSameTargetTest extends AbstractNodeTest {

    private Map<String, Object> run(String q) {
        GaiaWorkflow wf = new GaiaWorkflow(loadWorkflowJson("condition-same-target"));
        Map<String, Object> inputs = new HashMap<>();
        inputs.put("q", q);
        return wf.run(inputs);
    }

    @Test
    @DisplayName("正例（包含 gaia）→ end 执行且 out=true")
    void positivePathExecutes() {
        Map<String, Object> result = run("hello gaia");
        assertEquals(Boolean.TRUE, result.get("out"), "正例应走 if_hit: " + result);
    }

    @Test
    @DisplayName("反例（不包含）→ end 也必须执行且 out=false（不能被跳过）")
    void negativePathMustNotSkipEnd() {
        Map<String, Object> result = run("hello world");
        assertTrue(result.containsKey("out"), "反例 end 也必须执行（当前被跳过=bug）: " + result);
        assertEquals(Boolean.FALSE, result.get("out"));
    }
}
