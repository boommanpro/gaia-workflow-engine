package cn.boommanpro.gaia.workflow.app.service;

import cn.hutool.json.JSONObject;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * string-format 节点归一化契约（2026-10-18 会话 3d481faf 实证的三类畸形全部钉住）：
 * ① script 裸字符串 → {language, content}；② language 简写别名 → 引擎合法值；
 * ③ 缺 outputs 声明 → 补 formatStringResult（前端变量面板依赖）。
 * 附带：畸形 ref 杂交体修复、end 表单声明对齐、code script 字符串归一。
 */
@DisplayName("string-format 节点归一化：script 对象化 + 语言别名 + outputs 补齐")
class NodeDataNormalizerStringFormatTest {

    @Test
    @DisplayName("script 裸字符串 → 对象，语言按模板语法启发式（${} → spel-standard）")
    void scriptStringBecomesObjectSpelStandard() {
        JSONObject data = new JSONObject()
            .set("title", "格式化问候语")
            .set("script", "Hello, ${name}!");
        NodeDataNormalizer.normalize("string-format", data);

        JSONObject script = data.getJSONObject("script");
        assertEquals("spel-standard", script.getStr("language"));
        assertEquals("Hello, ${name}!", script.getStr("content"));
    }

    @Test
    @DisplayName("script 裸字符串含 {{}} → spel-vue；含 [()] → thymeleaf-text")
    void scriptStringLanguageHeuristics() {
        JSONObject vue = new JSONObject().set("script", "Hello, {{ name }}!");
        NodeDataNormalizer.normalize("string-format", vue);
        assertEquals("spel-vue", vue.getJSONObject("script").getStr("language"));

        JSONObject thymeleaf = new JSONObject().set("script", "Hello, [(${name})]!");
        NodeDataNormalizer.normalize("string-format", thymeleaf);
        assertEquals("thymeleaf-text", thymeleaf.getJSONObject("script").getStr("language"));
    }

    @Test
    @DisplayName("语言简写别名归一：spel/vue/thymeleaf → 引擎合法全称")
    void languageAliasesNormalized() {
        assertEquals("spel-standard", normalizeWithLanguage("spel"));
        assertEquals("spel-vue", normalizeWithLanguage("vue"));
        assertEquals("thymeleaf-text", normalizeWithLanguage("thymeleaf"));
        assertEquals("spel-standard", normalizeWithLanguage("spel-standard"));
    }

    @Test
    @DisplayName("缺 outputs 声明 → 补 formatStringResult（前端变量可见性）")
    void missingOutputsFilled() {
        JSONObject data = new JSONObject()
            .set("script", new JSONObject().set("language", "spel-vue").set("content", "Hi {{n}}"));
        NodeDataNormalizer.normalize("string-format", data);

        JSONObject properties = data.getJSONObject("outputs").getJSONObject("properties");
        assertTrue(properties.containsKey("formatStringResult"),
            "outputs 必须声明 formatStringResult，否则前端变量面板看不到该变量");
    }

    @Test
    @DisplayName("畸形 ref 杂交体修复：type:string + 数组 content + 杂散 value 键")
    void malformedRefHybridFixed() {
        JSONObject data = new JSONObject()
            .set("script", new JSONObject().set("language", "spel-standard").set("content", "Hello, ${name}!"))
            .set("inputsValues", new JSONObject()
                .set("name", new JSONObject()
                    .set("type", "string")
                    .set("content", new cn.hutool.json.JSONArray().set("start_1").set("input"))
                    .set("value", "World")));
        NodeDataNormalizer.normalize("string-format", data);

        JSONObject name = data.getJSONObject("inputsValues").getJSONObject("name");
        assertEquals("ref", name.getStr("type"), "数组 content 只能是 ref 语义");
        assertEquals("[\"start_1\",\"input\"]", name.getJSONArray("content").toString());
        assertTrue(!name.containsKey("value"), "杂散 value 键应被清除");
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
    @DisplayName("code 节点 script 裸字符串 → {language: javascript, content}")
    void codeScriptStringNormalized() {
        JSONObject data = new JSONObject().set("script", "var x = 1; x;");
        NodeDataNormalizer.normalize("code", data);
        assertEquals("javascript", data.getJSONObject("script").getStr("language"));
        assertEquals("var x = 1; x;", data.getJSONObject("script").getStr("content"));
    }

    @Test
    @DisplayName("会话 3d481faf 的完整畸形样本端到端归一为规范形状")
    void realWorldMalformedSampleFullyNormalized() {
        JSONObject data = new JSONObject()
            .set("inputsValues", new JSONObject()
                .set("name", new JSONObject()
                    .set("type", "string")
                    .set("content", new cn.hutool.json.JSONArray().set("start_1").set("input"))
                    .set("value", "World")))
            .set("inputs", new JSONObject().set("type", "object").set("properties", new JSONObject()
                .set("name", new JSONObject().set("type", "string"))))
            .set("title", "格式化问候语")
            .set("script", "Hello, ${name}!");
        NodeDataNormalizer.normalize("string-format", data);

        assertEquals("ref", data.getJSONObject("inputsValues").getJSONObject("name").getStr("type"));
        assertEquals("spel-standard", data.getJSONObject("script").getStr("language"));
        assertEquals("Hello, ${name}!", data.getJSONObject("script").getStr("content"));
        assertNotNull(data.getJSONObject("outputs").getJSONObject("properties")
            .getJSONObject("formatStringResult"));
    }

    private static String normalizeWithLanguage(String language) {
        JSONObject data = new JSONObject()
            .set("script", new JSONObject().set("language", language).set("content", "x"));
        NodeDataNormalizer.normalize("string-format", data);
        return data.getJSONObject("script").getStr("language");
    }
}
