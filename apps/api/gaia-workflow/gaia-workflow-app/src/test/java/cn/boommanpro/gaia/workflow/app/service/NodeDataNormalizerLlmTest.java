package cn.boommanpro.gaia.workflow.app.service;

import cn.hutool.json.JSONObject;
import cn.hutool.json.JSONUtil;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * llm 节点归一化契约：扁平字段 → inputsValues（既有行为）+
 * 表单 schema 对齐（x-gaia-form-inputs 单一事实源，2026-10-18 E2E 实证补齐）。
 * <p>
 * 前端属性面板纯 schema 驱动（FormInputs 只渲染 data.inputs.properties，
 * extra.formComponent=prompt-editor 选提示词编辑器）——AI 生成的 llm 节点
 * 若无规范 inputs，表单会缺字段、6 个配置值无 UI 承载。
 */
@DisplayName("llm 节点归一化：扁平字段 + 表单 schema 对齐")
class NodeDataNormalizerLlmTest {

    @Test
    @DisplayName("扁平字段归一化为 inputsValues 常量/模板形状")
    void flatFieldsMoveToInputsValues() {
        JSONObject data = new JSONObject()
            .set("modelName", "glm-4-flash")
            .set("apiKey", "sk-test")
            .set("apiHost", "https://www.dmxapi.cn/v1")
            .set("temperature", 0.3)
            .set("systemPrompt", "你是摘要助手")
            .set("prompt", "总结：{{ start_1.text }}");

        NodeDataNormalizer.normalize("llm", data);

        JSONObject iv = data.getJSONObject("inputsValues");
        assertEquals("glm-4-flash", iv.getJSONObject("modelName").getStr("content"));
        assertEquals("sk-test", iv.getJSONObject("apiKey").getStr("content"));
        assertEquals("https://www.dmxapi.cn/v1", iv.getJSONObject("apiHost").getStr("content"));
        assertEquals(0.3, iv.getJSONObject("temperature").getDouble("content"), 0.0001);
        assertEquals("template", iv.getJSONObject("systemPrompt").getStr("type"));
        assertEquals("总结：{{ start_1.text }}", iv.getJSONObject("prompt").getStr("content"));
    }

    @Test
    @DisplayName("模型自创的 inputs 声明被规范表单 schema 整体替换（text 之类消失）")
    void inventedInputsReplacedByCanonicalFormSchema() {
        JSONObject data = new JSONObject()
            .set("prompt", "总结：{{ start_1.text }}")
            .set("inputs", new JSONObject().set("type", "object").set("properties", new JSONObject()
                .set("text", new JSONObject().set("type", "string"))));

        NodeDataNormalizer.normalize("llm", data);

        JSONObject inputs = data.getJSONObject("inputs");
        assertNotNull(inputs, "归一化后必须有规范 inputs");
        JSONObject properties = inputs.getJSONObject("properties");
        assertTrue(properties.containsKey("modelName"), "properties 应含 modelName");
        assertTrue(properties.containsKey("apiKey"));
        assertTrue(properties.containsKey("apiHost"));
        assertTrue(properties.containsKey("temperature"));
        assertTrue(properties.containsKey("systemPrompt"));
        assertTrue(properties.containsKey("prompt"));
        assertFalse(properties.containsKey("text"), "模型自创的 text 声明应被替换");
        assertTrue(inputs.getJSONArray("required").contains("prompt"), "required 应含 prompt");
        assertEquals("prompt-editor",
            properties.getJSONObject("prompt").getJSONObject("extra").getStr("formComponent"));
        assertEquals("prompt-editor",
            properties.getJSONObject("systemPrompt").getJSONObject("extra").getStr("formComponent"));
    }

    @Test
    @DisplayName("无 inputs 时补齐规范表单 schema；与前端手工添加形状一致")
    void missingInputsFilledWithCanonicalSchema() {
        JSONObject data = new JSONObject().set("prompt", "hi");
        NodeDataNormalizer.normalize("llm", data);

        JSONObject inputs = data.getJSONObject("inputs");
        assertNotNull(inputs);
        assertEquals(JSONUtil.parseObj(NodeSchemaRegistry.rawSchema("llm"))
                .getJSONObject("x-gaia-form-inputs").toString(),
            inputs.toString(), "inputs 应逐字段等于 x-gaia-form-inputs 扩展");
    }

    @Test
    @DisplayName("归一化幂等：跑两次形状不变")
    void normalizationIsIdempotent() {
        JSONObject data = new JSONObject()
            .set("prompt", "总结")
            .set("inputs", new JSONObject().set("properties", new JSONObject()
                .set("text", new JSONObject().set("type", "string"))));
        NodeDataNormalizer.normalize("llm", data);
        String once = data.toString();
        NodeDataNormalizer.normalize("llm", data);
        assertEquals(once, data.toString());
    }
}
