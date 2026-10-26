package cn.boommanpro.gaia.workflow.app.service;

import cn.hutool.json.JSONObject;
import cn.hutool.json.JSONUtil;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * code 节点归一化：inputsValues 绑了值而 inputs.properties 未声明的入参自动补声明。
 * 引擎（CodeNodeParser）只按 inputs.properties 建参数 —— 2026-10-24 会话 b6e34195 实证
 * 模型绑 8 个 ref 只声明 2 个，运行时 orderId 等全部 undefined 且 update 回 ok，
 * 12 轮整流调试无果。
 */
@DisplayName("code 节点归一化：inputsValues 键自动补进 inputs.properties")
class NodeDataNormalizerCodeTest {

    @Test
    @DisplayName("未声明的 ref 入参补 string 声明；已声明的保持原样")
    void undeclaredRefInputsGetDeclared() {
        JSONObject data = JSONUtil.parseObj("{"
            + "\"script\":{\"language\":\"javascript\",\"content\":\"({ok: orderId})\"},"
            + "\"inputs\":{\"type\":\"object\",\"properties\":{\"exchangeData\":{\"type\":\"object\"}}},"
            + "\"inputsValues\":{"
            + "  \"exchangeData\":{\"type\":\"ref\",\"content\":[\"http_1\",\"body\"]},"
            + "  \"orderId\":{\"type\":\"ref\",\"content\":[\"start_1\",\"orderId\"]},"
            + "  \"items\":{\"type\":\"ref\",\"content\":[\"start_1\",\"items\"]}"
            + "}}");
        NodeDataNormalizer.normalize("code", data);
        JSONObject props = data.getJSONObject("inputs").getJSONObject("properties");
        assertEquals("object", props.getJSONObject("exchangeData").getStr("type"), "已声明的类型不被改写");
        assertEquals("string", props.getJSONObject("orderId").getStr("type"));
        assertEquals("string", props.getJSONObject("items").getStr("type"));
        assertEquals(3, props.size());
    }

    @Test
    @DisplayName("常量值按内容推断声明类型；inputs 整体缺失时补建")
    void constantTypesInferredAndInputsCreated() {
        JSONObject data = JSONUtil.parseObj("{"
            + "\"script\":{\"language\":\"javascript\",\"content\":\"({})\"},"
            + "\"inputsValues\":{"
            + "  \"threshold\":{\"type\":\"constant\",\"content\":500},"
            + "  \"enabled\":{\"type\":\"constant\",\"content\":true},"
            + "  \"tags\":{\"type\":\"constant\",\"content\":[\"a\"]},"
            + "  \"meta\":{\"type\":\"constant\",\"content\":{\"k\":1}},"
            + "  \"name\":{\"type\":\"constant\",\"content\":\"x\"}"
            + "}}");
        NodeDataNormalizer.normalize("code", data);
        JSONObject props = data.getJSONObject("inputs").getJSONObject("properties");
        assertEquals("number", props.getJSONObject("threshold").getStr("type"));
        assertEquals("boolean", props.getJSONObject("enabled").getStr("type"));
        assertEquals("array", props.getJSONObject("tags").getStr("type"));
        assertEquals("object", props.getJSONObject("meta").getStr("type"));
        assertEquals("string", props.getJSONObject("name").getStr("type"));
    }

    @Test
    @DisplayName("没有 inputsValues 时不动 inputs（不凭空造声明）")
    void noInputsValuesNoChange() {
        JSONObject data = JSONUtil.parseObj("{\"script\":{\"language\":\"javascript\",\"content\":\"({})\"}}");
        NodeDataNormalizer.normalize("code", data);
        assertNull(data.get("inputs"));
        assertTrue(data.containsKey("script"));
    }

    @Test
    @DisplayName("script 裸字符串 + 平级 language（意图无歧义，实证连拒 3 次）→ script:{language, content}；无 language 的裸字符串保持既定决策不归一")
    void flatScriptStringBecomesObject() {
        JSONObject data = JSONUtil.parseObj("{\"script\":\"({ok: true})\",\"language\":\"javascript\"}");
        NodeDataNormalizer.normalize("code", data);
        JSONObject script = data.getJSONObject("script");
        assertEquals("javascript", script.getStr("language"));
        assertEquals("({ok: true})", script.getStr("content"));
        assertNull(data.get("language"), "平级 language 应被收进 script");

        JSONObject flatCode = JSONUtil.parseObj("{\"code\":\"({})\",\"language\":\"groovy\"}");
        NodeDataNormalizer.normalize("code", flatCode);
        assertEquals("groovy", flatCode.getJSONObject("script").getStr("language"));
        assertEquals("({})", flatCode.getJSONObject("script").getStr("content"));

        // 语言不明不猜：裸字符串无 language 仍保持原样（由契约拒绝，见 NodeDataNormalizerStringFormatTest）
        JSONObject bare = JSONUtil.parseObj("{\"script\":\"var x = 1; x;\"}");
        NodeDataNormalizer.normalize("code", bare);
        assertTrue(bare.get("script") instanceof String);
    }
}
