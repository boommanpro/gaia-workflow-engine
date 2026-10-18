package cn.boommanpro.gaia.workflow.app.node;

import cn.boommanpro.gaia.workflow.base.GaiaWorkflow;
import cn.hutool.json.JSONArray;
import cn.hutool.json.JSONObject;
import cn.hutool.json.JSONUtil;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.HashMap;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * code 节点知识契约：知识库（seed/node-knowledge.json）内联示例必须可被真实引擎执行。
 * <p>
 * {@code CodeNodeExamplesTest} 守护的是 {@code code-examples/} 源文件；本测试守护的是
 * 知识条目里的<b>内联副本</b>（json/java/groovy 三段 ``` 围栏代码），以及知识文本中的
 * 关键契约表述——防止知识与引擎行为漂移（"知识即被测资产"）。
 */
@DisplayName("code 节点知识契约：内联示例可执行 + 关键契约表述")
class CodeNodeKnowledgeContractTest extends AbstractNodeTest {

    private static String knowledge;

    @BeforeAll
    static void loadKnowledge() {
        knowledge = knowledgeCodeEntry().getStr("content");
        assertNotNull(knowledge, "node-knowledge.json 缺少 code 条目");
    }

    private static JSONObject knowledgeCodeEntry() {
        JSONArray items = JSONUtil.parseArray(readResource("/seed/node-knowledge.json"));
        for (Object item : items) {
            JSONObject entry = (JSONObject) item;
            if ("code".equals(entry.getStr("nodeType"))) {
                return entry;
            }
        }
        throw new IllegalStateException("node-knowledge.json 中找不到 code 条目");
    }

    /** 提取知识条目中 ```language 围栏代码块 */
    private static String fenced(String language) {
        Matcher matcher = Pattern.compile("```" + language + "\\s*\\n(.*?)```", Pattern.DOTALL)
            .matcher(knowledge);
        assertTrue(matcher.find(), "知识条目缺少 ```" + language + " 示例");
        return matcher.group(1).trim();
    }

    // ==================================================================
    // 内联示例可执行性（三引擎全跑真 GaiaWorkflow）
    // ==================================================================

    @Test
    @DisplayName("知识内联 JSON 示例（javascript）可执行：greeting/length 正确")
    void jsonExampleExecutes() {
        JSONObject example = JSONUtil.parseObj(fenced("json"));
        JSONObject codeNode = example.set("id", "code_0");
        codeNode.getJSONObject("data").getJSONObject("inputsValues")
            .set("name", ref("start_0", "query"));

        Map<String, Object> result = runWorkflowWith(codeNode, "Gaia", "greeting", "length");
        assertEquals("Hello, Gaia!", result.get("greeting"));
        assertEquals(4, ((Number) result.get("length")).intValue());
    }

    @Test
    @DisplayName("知识内联 Java 示例可执行：execute(Map) 反射调用，输出 greeting/length")
    void javaExampleExecutes() {
        Map<String, Object> result = runWorkflowWith(
            codeNodeOf("java", fenced("java"),
                new String[][]{{"greeting", "string"}, {"length", "number"}}),
            "Gaia", "greeting", "length");
        assertEquals("Hello, Gaia!", result.get("greeting"));
        assertEquals(4, ((Number) result.get("length")).intValue());
    }

    @Test
    @DisplayName("知识内联 Groovy 示例可执行：输出 greeting/upper")
    void groovyExampleExecutes() {
        Map<String, Object> result = runWorkflowWith(
            codeNodeOf("groovy", fenced("groovy"),
                new String[][]{{"greeting", "string"}, {"upper", "string"}}),
            "Gaia", "greeting", "upper");
        assertEquals("Hello, Gaia!", result.get("greeting"));
        assertEquals("GAIA", result.get("upper"));
    }

    @Test
    @DisplayName("outputs 白名单语义：未声明的键被丢弃、不写 outputs 输出为空（引擎 parseOutputResult 实证）")
    void outputsDeclarationIsAWhitelist() {
        // 同一段 JS：声明 upper 白名单 → greeting 被丢弃
        Map<String, Object> partial = runWorkflowWith(
            codeNodeOf("javascript", "({ greeting: 'Hi, ' + name, upper: name.toUpperCase() })",
                new String[][]{{"upper", "string"}}),
            "Gaia", "upper");
        assertEquals("GAIA", partial.get("upper"));

        // 完全不声明 outputs → 节点输出被丢弃，下游引用为 null
        JSONObject noOutputs = codeNodeOf("javascript", "({ greeting: 'Hi, ' + name })",
            new String[][]{{"greeting", "string"}});
        noOutputs.getJSONObject("data").remove("outputs");
        Map<String, Object> empty = runWorkflowWith(noOutputs, "Gaia", "greeting");
        assertTrue(empty == null || empty.get("greeting") == null,
            "不声明 outputs 时节点输出应被丢弃（下游引用为 null）");
    }

    // ==================================================================
    // 关键契约表述（与引擎实现逐条对照的事实，防止知识回退/漂移）
    // ==================================================================

    @Test
    @DisplayName("知识文本包含引擎契约关键事实：字段名/语言集/输入方式/返回值")
    void knowledgeStatesEngineContracts() {
        // 字段是 script.content（CodeNodeParser 读取 $.data.script.content），不是 data.code
        assertTrue(knowledge.contains("script.content"), "必须写明 script.content 字段");
        assertTrue(knowledge.contains("inputsValues"), "必须区分 inputsValues（值/引用）与 inputs（声明）");
        // 语言集：js/jsReturn/null 均路由 GraalJS（CodeNodeParser.isJavaScript）
        assertTrue(knowledge.contains("jsReturn"), "必须写明 js/jsReturn 别名");
        // JS 输入是顶层变量、Java/Groovy 输入是单个 Map 参数（两种获取方式的差异）
        assertTrue(knowledge.contains("顶层变量"), "JS 输入注入方式必须写明");
        assertTrue(knowledge.contains("execute(Map"), "Java/Groovy 的 execute(Map) 契约必须写明");
        // 不支持的语言运行期才失败（schema 无枚举约束，CompilerEngineEnum.valueOf 抛异常）
        assertTrue(knowledge.contains("运行"), "未知语言的运行期失败行为必须警示");
        // 返回值必须是 Map；JS 标量会被包成 {result: 值}
        assertTrue(knowledge.contains("Map"), "返回 Map 契约必须写明");
        assertTrue(knowledge.contains("result"), "JS 标量包装规则必须写明");
        // outputs.properties 是白名单（Chain.parseOutputResult 过滤），必须写明
        assertTrue(knowledge.contains("输出白名单"), "outputs 白名单语义必须写明");
    }

    // ------------------------------------------------------------------

    private static JSONObject codeNodeOf(String language, String content, String[][] outputs) {
        JSONObject outputProperties = new JSONObject();
        for (String[] output : outputs) {
            outputProperties.set(output[0], new JSONObject().set("type", output[1]));
        }
        return new JSONObject()
            .set("id", "code_0").set("type", "code")
            .set("meta", new JSONObject().set("position", new JSONObject().set("x", 500).set("y", 200)))
            .set("data", new JSONObject().set("title", "代码节点")
                .set("script", new JSONObject().set("language", language).set("content", content))
                .set("inputsValues", new JSONObject().set("name", ref("start_0", "query")))
                .set("inputs", new JSONObject().set("type", "object").set("properties", new JSONObject()
                    .set("name", new JSONObject().set("type", "string"))))
                .set("outputs", new JSONObject().set("type", "object")
                    .set("properties", outputProperties)));
    }

    /** start(query=default) → code → 端到端执行，返回 end 输出（outputKeys 决定 end 引用哪些键） */
    private static Map<String, Object> runWorkflowWith(JSONObject codeNode, String query, String... outputKeys) {
        codeNode.getJSONObject("data").getJSONObject("inputsValues")
            .set("name", ref("start_0", "query"));
        JSONObject endInputsValues = new JSONObject();
        JSONObject endProperties = new JSONObject();
        for (String key : outputKeys) {
            endInputsValues.set(key, ref("code_0", key));
            endProperties.set(key, new JSONObject().set("type",
                "length".equals(key) ? "number" : "string"));
        }
        JSONObject doc = new JSONObject()
            .set("nodes", new JSONArray()
                .set(new JSONObject()
                    .set("id", "start_0").set("type", "start")
                    .set("meta", new JSONObject().set("position", new JSONObject().set("x", 180).set("y", 200)))
                    .set("data", new JSONObject().set("title", "开始")
                        .set("outputs", new JSONObject().set("type", "object").set("properties", new JSONObject()
                            .set("query", new JSONObject().set("type", "string").set("default", query))))))
                .set(codeNode)
                .set(new JSONObject()
                    .set("id", "end_0").set("type", "end")
                    .set("meta", new JSONObject().set("position", new JSONObject().set("x", 820).set("y", 200)))
                    .set("data", new JSONObject().set("title", "结束")
                        .set("inputsValues", endInputsValues)
                        .set("inputs", new JSONObject().set("type", "object")
                            .set("properties", endProperties)))))
            .set("edges", new JSONArray()
                .set(new JSONObject().set("sourceNodeID", "start_0").set("targetNodeID", "code_0"))
                .set(new JSONObject().set("sourceNodeID", "code_0").set("targetNodeID", "end_0")));

        Map<String, Object> inputs = new HashMap<>();
        inputs.put("query", query);
        return new GaiaWorkflow(doc.toString()).run(inputs);
    }

    private static JSONObject ref(String nodeId, String field) {
        return new JSONObject().set("type", "ref").set("content", new JSONArray().set(nodeId).set(field));
    }
}
