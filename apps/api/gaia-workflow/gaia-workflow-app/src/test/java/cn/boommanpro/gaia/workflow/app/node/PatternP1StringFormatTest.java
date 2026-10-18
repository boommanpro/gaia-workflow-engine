package cn.boommanpro.gaia.workflow.app.node;

import cn.boommanpro.gaia.workflow.base.GaiaWorkflow;
import cn.hutool.json.JSONArray;
import cn.hutool.json.JSONObject;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.HashMap;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

/**
 * 基准模式 P1（纯转换：start → string-format → end）矩阵测试。
 * <p>
 * 三种模板语言全矩阵 + 引用链（start 输出 → 模板入参 → end 输出）断言，
 * 是「会话创建问候语渲染类工作流」的引擎层等价物。
 */
@DisplayName("P1 纯转换模式：start → string-format → end（三模板语言矩阵）")
class PatternP1StringFormatTest extends AbstractNodeTest {

    @Test
    @DisplayName("spel-standard：${name} 占位（复用既有夹具）")
    void spelStandardPipeline() {
        GaiaWorkflow wf = new GaiaWorkflow(loadWorkflowJson("string-format-pipeline"));
        Map<String, Object> result = wf.run(map("query", "World"));
        assertEquals("Hello, World!", result.get("output"));
    }

    @Test
    @DisplayName("spel-vue：{{ name }} 占位")
    void spelVuePipeline() {
        GaiaWorkflow wf = new GaiaWorkflow(loadWorkflowJson("p1-string-format-vue"));
        Map<String, Object> result = wf.run(map("name", "Gaia"));
        assertEquals("Hello, Gaia!", result.get("output"));
    }

    @Test
    @DisplayName("thymeleaf-text：[(${name})] 内联表达式")
    void thymeleafTextPipeline() {
        GaiaWorkflow wf = new GaiaWorkflow(thymeleafDoc());
        Map<String, Object> result = wf.run(map("name", "Thymeleaf"));
        assertEquals("Hello, Thymeleaf!", result.get("output"));
    }

    @Test
    @DisplayName("缺省输入回退 start 默认值，引用链仍成立")
    void startDefaultBackfillsRefChain() {
        GaiaWorkflow wf = new GaiaWorkflow(loadWorkflowJson("p1-string-format-vue"));
        Map<String, Object> result = wf.run(new HashMap<>());
        assertEquals("Hello, Vue!", result.get("output"),
            "不传 name 时应使用 start.outputs.properties.name.default");
    }

    @Test
    @DisplayName("多输入引用：两个上游字段同时进模板")
    void multipleRefsRenderTogether() {
        GaiaWorkflow wf = new GaiaWorkflow(multiRefDoc());
        Map<String, Object> inputs = new HashMap<>();
        inputs.put("greeting", "你好");
        inputs.put("name", "世界");
        Map<String, Object> result = wf.run(inputs);
        assertEquals("你好, 世界!", result.get("output"));
    }

    // ------------------------------------------------------------------
    // 文档构造（thymeleaf / 多引用 无独立夹具，代码内联构造，结构与夹具一致）
    // ------------------------------------------------------------------

    private static String thymeleafDoc() {
        return stringFormatDoc("thymeleaf-text", "Hello, [(${name})]!");
    }

    private static String multiRefDoc() {
        JSONObject doc = stringFormatDocObject();
        JSONObject sf = doc.getJSONArray("nodes").getJSONObject(1);
        sf.getJSONObject("data")
            .set("inputsValues", new JSONObject()
                .set("greeting", ref("start_0", "greeting"))
                .set("name", ref("start_0", "name")))
            .set("script", new JSONObject()
                .set("language", "spel-standard").set("content", "${greeting}, ${name}!"))
            .set("inputs", new JSONObject().set("type", "object").set("properties", new JSONObject()
                .set("greeting", new JSONObject().set("type", "string"))
                .set("name", new JSONObject().set("type", "string"))));
        JSONObject start = doc.getJSONArray("nodes").getJSONObject(0);
        start.getJSONObject("data").set("outputs", new JSONObject().set("type", "object")
            .set("properties", new JSONObject()
                .set("greeting", new JSONObject().set("type", "string").set("default", "Hello"))
                .set("name", new JSONObject().set("type", "string").set("default", "Flow"))));
        return doc.toString();
    }

    private static String stringFormatDoc(String language, String content) {
        JSONObject doc = stringFormatDocObject();
        doc.getJSONArray("nodes").getJSONObject(1).getJSONObject("data")
            .set("script", new JSONObject().set("language", language).set("content", content));
        return doc.toString();
    }

    /** P1 标准三节点骨架：start(name) → string-format → end(output) */
    private static JSONObject stringFormatDocObject() {
        JSONObject start = new JSONObject()
            .set("id", "start_0").set("type", "start")
            .set("meta", new JSONObject().set("position", new JSONObject().set("x", 180).set("y", 180)))
            .set("data", new JSONObject().set("title", "开始")
                .set("outputs", new JSONObject().set("type", "object").set("properties", new JSONObject()
                    .set("name", new JSONObject().set("type", "string").set("default", "Flow")))));
        JSONObject format = new JSONObject()
            .set("id", "string_format_0").set("type", "string-format")
            .set("meta", new JSONObject().set("position", new JSONObject().set("x", 500).set("y", 180)))
            .set("data", new JSONObject().set("title", "格式化")
                .set("inputsValues", new JSONObject().set("name", ref("start_0", "name")))
                .set("script", new JSONObject().set("language", "spel-standard").set("content", "Hello, ${name}!"))
                .set("inputs", new JSONObject().set("type", "object").set("properties", new JSONObject()
                    .set("name", new JSONObject().set("type", "string"))))
                .set("outputs", new JSONObject().set("type", "object").set("properties", new JSONObject()
                    .set("formatStringResult", new JSONObject().set("type", "string")))));
        JSONObject end = new JSONObject()
            .set("id", "end_0").set("type", "end")
            .set("meta", new JSONObject().set("position", new JSONObject().set("x", 820).set("y", 180)))
            .set("data", new JSONObject().set("title", "结束")
                .set("inputsValues", new JSONObject().set("output", ref("string_format_0", "formatStringResult")))
                .set("inputs", new JSONObject().set("type", "object").set("properties", new JSONObject()
                    .set("output", new JSONObject().set("type", "string")))));
        return new JSONObject()
            .set("nodes", new JSONArray().set(start).set(format).set(end))
            .set("edges", new JSONArray()
                .set(new JSONObject().set("sourceNodeID", "start_0").set("targetNodeID", "string_format_0"))
                .set(new JSONObject().set("sourceNodeID", "string_format_0").set("targetNodeID", "end_0")));
    }

    private static JSONObject ref(String nodeId, String field) {
        return new JSONObject().set("type", "ref").set("content", new JSONArray().set(nodeId).set(field));
    }

    private static Map<String, Object> map(String k, Object v) {
        Map<String, Object> m = new HashMap<>();
        m.put(k, v);
        return m;
    }
}
