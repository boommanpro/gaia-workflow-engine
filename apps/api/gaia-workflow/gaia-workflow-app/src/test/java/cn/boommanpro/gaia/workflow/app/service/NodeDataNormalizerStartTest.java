package cn.boommanpro.gaia.workflow.app.service;

import cn.hutool.json.JSONObject;
import cn.hutool.json.JSONUtil;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * start 节点归一化：模型常把参数声明直接写在 outputs 下、漏掉 properties 一层
 * （2026-10-24 会话 b6e34195 实证被判「没有定义任何输出参数」拒绝）。
 */
@DisplayName("start 节点归一化：outputs 下的扁平声明提进 properties")
class NodeDataNormalizerStartTest {

    @Test
    @DisplayName("outputs:{orderId:{type}, amount:{type}} → outputs.properties.{orderId, amount}")
    void flatDeclarationsLiftedIntoProperties() {
        JSONObject data = JSONUtil.parseObj(
            "{\"outputs\":{\"orderId\":{\"type\":\"string\",\"title\":\"订单号\"},\"amount\":{\"type\":\"number\"}}}");
        NodeDataNormalizer.normalize("start", data);
        JSONObject outputs = data.getJSONObject("outputs");
        assertEquals("object", outputs.getStr("type"));
        JSONObject props = outputs.getJSONObject("properties");
        assertEquals(2, props.size());
        assertEquals("string", props.getJSONObject("orderId").getStr("type"));
        assertEquals("number", props.getJSONObject("amount").getStr("type"));
        assertFalse(outputs.containsKey("orderId"), "扁平声明应被搬走");
    }

    @Test
    @DisplayName("已是规范形状的 outputs 不受影响")
    void canonicalOutputsUntouched() {
        JSONObject data = JSONUtil.parseObj(
            "{\"outputs\":{\"type\":\"object\",\"properties\":{\"q\":{\"type\":\"string\"}},\"required\":[\"q\"]}}");
        NodeDataNormalizer.normalize("start", data);
        JSONObject outputs = data.getJSONObject("outputs");
        assertEquals(1, outputs.getJSONObject("properties").size());
        assertTrue(outputs.containsKey("required"));
    }
}
