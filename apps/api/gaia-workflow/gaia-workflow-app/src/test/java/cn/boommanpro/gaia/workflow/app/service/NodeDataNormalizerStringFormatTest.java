package cn.boommanpro.gaia.workflow.app.service;

import cn.hutool.json.JSONObject;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * string-format 节点归一化契约（2026-10-24 零兼容版）：
 * 归一化只保留「确定性补齐」（outputs 声明 formatStringResult、end 表单声明对齐）——
 * 此前对 script 裸字符串/语言别名/畸形 ref 杂交体的静默修补已全部移除：
 * 非规范形状由严格 schema 拒绝（错误带字段路径），而不是被猜着修。
 */
@DisplayName("string-format 归一化：确定性补齐 + 畸形形状交给严格契约拒绝")
class NodeDataNormalizerStringFormatTest {

    @Test
    @DisplayName("规范形状原样保留：script 对象 + 合法语言 + outputs 已声明")
    void canonicalShapeUntouched() {
        JSONObject data = new JSONObject()
            .set("title", "格式化问候语")
            .set("script", new JSONObject().set("language", "spel-standard").set("content", "Hello, ${name}!"))
            .set("inputsValues", new JSONObject()
                .set("name", new JSONObject().set("type", "ref")
                    .set("content", new cn.hutool.json.JSONArray().set("start_1").set("input"))))
            .set("inputs", new JSONObject().set("type", "object").set("properties", new JSONObject()
                .set("name", new JSONObject().set("type", "string"))));
        NodeDataNormalizer.normalize("string-format", data);

        assertEquals("spel-standard", data.getJSONObject("script").getStr("language"));
        assertEquals("Hello, ${name}!", data.getJSONObject("script").getStr("content"));
        assertEquals("ref", data.getJSONObject("inputsValues").getJSONObject("name").getStr("type"));
        JSONObject properties = data.getJSONObject("outputs").getJSONObject("properties");
        assertTrue(properties.containsKey("formatStringResult"),
            "outputs 必须声明 formatStringResult，否则前端变量面板看不到该变量");
        assertTrue(NodeSchemaRegistry.validateParams("string-format", data.toString()).isEmpty(),
            "规范形状必须通过严格契约");
    }

    @Test
    @DisplayName("缺 outputs 声明 → 确定性补 formatStringResult（前端变量可见性）")
    void missingOutputsFilled() {
        JSONObject data = new JSONObject()
            .set("script", new JSONObject().set("language", "spel-vue").set("content", "Hi {{n}}"));
        NodeDataNormalizer.normalize("string-format", data);

        JSONObject properties = data.getJSONObject("outputs").getJSONObject("properties");
        assertTrue(properties.containsKey("formatStringResult"),
            "outputs 必须声明 formatStringResult，否则前端变量面板看不到该变量");
    }

    @Test
    @DisplayName("script 裸字符串不再被猜着转对象——严格契约直接拒绝（错误带路径）")
    void bareScriptStringRejectedByContract() {
        JSONObject data = new JSONObject().set("script", "Hello, ${name}!");
        NodeDataNormalizer.normalize("string-format", data);
        // normalize 不再转换，script 仍是裸字符串
        assertEquals("Hello, ${name}!", data.getStr("script"));
        List<String> violations = NodeSchemaRegistry.validateParams("string-format", data.toString());
        assertFalse(violations.isEmpty(), "裸 script 字符串必须被严格契约拒绝");
        assertTrue(violations.stream().anyMatch(v -> v.contains("script")),
            "违规消息应指向 script 字段");
    }

    @Test
    @DisplayName("语言别名（spel/vue）不再被归一——契约枚举直接拒绝")
    void languageAliasesRejectedByContract() {
        for (String alias : new String[]{"spel", "vue", "thymeleaf"}) {
            JSONObject data = new JSONObject()
                .set("script", new JSONObject().set("language", alias).set("content", "x"));
            NodeDataNormalizer.normalize("string-format", data);
            List<String> violations = NodeSchemaRegistry.validateParams("string-format", data.toString());
            assertFalse(violations.isEmpty(), "语言别名 " + alias + " 必须被枚举拒绝（引擎真值是 spel-standard/spel-vue/thymeleaf-text）");
        }
    }

    @Test
    @DisplayName("畸形 ref 杂交体（type:string + 数组 content + 杂散 value 键）不再被修——契约拒绝")
    void malformedRefHybridRejected() {
        JSONObject data = new JSONObject()
            .set("script", new JSONObject().set("language", "spel-standard").set("content", "Hello, ${name}!"))
            .set("inputsValues", new JSONObject()
                .set("name", new JSONObject()
                    .set("type", "string")
                    .set("content", new cn.hutool.json.JSONArray().set("start_1").set("input"))
                    .set("value", "World")));
        NodeDataNormalizer.normalize("string-format", data);

        JSONObject name = data.getJSONObject("inputsValues").getJSONObject("name");
        assertEquals("string", name.getStr("type"), "normalize 不再猜着修杂交形状");
        List<String> violations = NodeSchemaRegistry.validateParams("string-format", data.toString());
        assertFalse(violations.isEmpty(), "杂交 ref 形状必须被契约拒绝（须显式写 type:ref）");
    }

    @Test
    @DisplayName("end 节点：inputsValues 有值而 inputs.properties 缺声明 → 补齐（表单可见性）")
    void endInputsDeclaredFromValues() {
        JSONObject data = new JSONObject()
            .set("inputsValues", new JSONObject()
                .set("greeting", new JSONObject().set("type", "ref")
                    .set("content", new cn.hutool.json.JSONArray().set("string_format_2").set("formatStringResult"))))
            .set("inputs", new JSONObject().set("type", "object").set("properties", new JSONObject()));
        NodeDataNormalizer.normalize("end", data);

        JSONObject properties = data.getJSONObject("inputs").getJSONObject("properties");
        assertTrue(properties.containsKey("greeting"), "end 的输出字段必须有表单声明");
    }

    @Test
    @DisplayName("code 节点 script 裸字符串不再归一——契约拒绝（要求 {language, content} 对象）")
    void codeScriptStringRejected() {
        JSONObject data = new JSONObject().set("script", "var x = 1; x;");
        NodeDataNormalizer.normalize("code", data);
        List<String> violations = NodeSchemaRegistry.validateParams("code", data.toString());
        assertFalse(violations.isEmpty(), "code 裸 script 必须被契约拒绝");
    }
}
