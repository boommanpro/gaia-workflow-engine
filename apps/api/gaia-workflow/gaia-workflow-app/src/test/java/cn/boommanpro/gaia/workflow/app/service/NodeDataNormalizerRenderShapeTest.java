package cn.boommanpro.gaia.workflow.app.service;

import cn.hutool.json.JSONArray;
import cn.hutool.json.JSONObject;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * 2026-10-25 渲染一致性修复的归一化契约（会话 b9019b24 实证驱动）：
 * · 固定输出对齐：llm/http 的 data.outputs 声明集必须等于运行时真实产出
 *   （llm 只写 result；AI 自声明的 riskLevel 等运行期恒 null，留在变量树里诱导断裂引用）；
 * · 通用模板 token 收敛：已是包装形状的 template 值（end/condition/http body 等）
 *   也要收敛 {{ a.b }} → {{a.b}}（前端渲染层按 . 拆段不 trim，带空格显示 Unknown）；
 * · code 入参声明类型传播：ref 指向上游已声明输出时拷贝类型（不再一律 string 占位）。
 */
@DisplayName("归一化渲染一致性：固定输出对齐 / token 收敛 / 类型传播")
class NodeDataNormalizerRenderShapeTest {

    @Test
    @DisplayName("llm：AI 自声明的额外输出字段被删除，声明集对齐固定 result")
    void llmOutputsAlignedToStaticContract() {
        JSONObject data = new JSONObject()
            .set("prompt", "评估：{{start_1.q}}")
            .set("outputs", new JSONObject().set("type", "object").set("properties", new JSONObject()
                .set("riskLevel", new JSONObject().set("type", "string"))
                .set("result", new JSONObject().set("type", "string"))));

        NodeDataNormalizer.normalize("llm", data);

        JSONObject properties = data.getJSONObject("outputs").getJSONObject("properties");
        assertTrue(properties.containsKey("result"), "固定输出 result 必须保留");
        assertFalse(properties.containsKey("riskLevel"),
            "AI 自声明的 riskLevel 运行期恒为 null（LlmNode 只写 result），必须删除");
        assertEquals(1, properties.keySet().size(), "llm 输出声明集必须等于 x-gaia-outputs");
    }

    @Test
    @DisplayName("llm json 输出模式：outputs 声明集保留（不被固定 result 压平）")
    void llmJsonModeKeepsDeclaredOutputs() {
        JSONObject data = new JSONObject()
            .set("outputMode", "json")
            .set("prompt", "评估：{{start_1.q}}")
            .set("outputs", new JSONObject().set("type", "object").set("properties", new JSONObject()
                .set("riskLevel", new JSONObject().set("type", "string"))
                .set("score", new JSONObject().set("type", "number"))));

        NodeDataNormalizer.normalize("llm", data);

        JSONObject properties = data.getJSONObject("outputs").getJSONObject("properties");
        assertTrue(properties.containsKey("riskLevel") && properties.containsKey("score"),
            "json 模式的声明集是运行时输出契约，必须保留");
        assertFalse(properties.containsKey("result"), "json 模式不注入固定 result");
        assertEquals("json", data.getStr("outputMode"));
    }

    @Test
    @DisplayName("llm text→json 切换：残留的 result 声明被剥除（会话 020729 实证，null 输出误导面板）")
    void llmJsonModeStripsLeftoverResultDeclaration() {
        JSONObject data = new JSONObject()
            .set("outputMode", "json")
            .set("prompt", "评估：{{start_1.q}}")
            .set("outputs", new JSONObject().set("type", "object").set("properties", new JSONObject()
                .set("result", new JSONObject().set("type", "string"))
                .set("sentiment", new JSONObject().set("type", "string"))));

        NodeDataNormalizer.normalize("llm", data);

        JSONObject properties = data.getJSONObject("outputs").getJSONObject("properties");
        assertFalse(properties.containsKey("result"), "text→json 切换残留的 result 必须剥除");
        assertTrue(properties.containsKey("sentiment"), "json 声明保留");
    }

    @Test
    @DisplayName("http：outputs 声明集对齐 body/headers/statusCode，额外声明删除、既有类型保留")
    void httpOutputsAligned() {
        JSONObject data = new JSONObject()
            .set("api", new JSONObject().set("method", "GET").set("url", "https://real.gaia.dev/api"))
            .set("outputs", new JSONObject().set("type", "object").set("properties", new JSONObject()
                .set("body", new JSONObject().set("type", "string"))
                .set("extra", new JSONObject().set("type", "string"))));

        NodeDataNormalizer.normalize("http", data);

        JSONObject properties = data.getJSONObject("outputs").getJSONObject("properties");
        assertTrue(properties.containsKey("body"));
        assertTrue(properties.containsKey("headers"));
        assertTrue(properties.containsKey("statusCode"));
        assertFalse(properties.containsKey("extra"), "固定输出节点不允许自声明额外输出");
    }

    @Test
    @DisplayName("已是包装形状的 template 值通用收敛：end/condition 里的 {{ a.b }} → {{a.b}}")
    void wrappedTemplateTokensCanonicalizedForAllTypes() {
        JSONObject end = new JSONObject().set("inputsValues", new JSONObject()
            .set("report", new JSONObject().set("type", "template")
                .set("content", "报告：{{ code_1.result }} / {{ llm_1.result }}")));
        NodeDataNormalizer.normalize("end", end);
        assertEquals("报告：{{code_1.result}} / {{llm_1.result}}",
            end.getJSONObject("inputsValues").getJSONObject("report").getStr("content"));

        JSONObject condition = new JSONObject().set("conditions", new JSONArray()
            .set(new JSONObject().set("key", "hit").set("value", new JSONObject()
                .set("left", new JSONObject().set("type", "template").set("content", "x {{ start_1.q }} y"))
                .set("operator", "contains")
                .set("right", new JSONObject().set("type", "constant").set("content", "a")))));
        NodeDataNormalizer.normalize("condition", condition);
        assertEquals("x {{start_1.q}} y",
            condition.getJSONArray("conditions").getJSONObject(0)
                .getJSONObject("value").getJSONObject("left").getStr("content"));
    }

    @Test
    @DisplayName("code 入参类型传播：ref 指向上游已声明输出时拷贝类型，覆盖 string 占位")
    void inputTypesPropagatedFromUpstreamDeclarations() {
        JSONObject codeNode = new JSONObject()
            .set("id", "code_1").set("type", "code")
            .set("data", new JSONObject()
                .set("script", new JSONObject().set("language", "javascript").set("content", "({})"))
                .set("inputsValues", new JSONObject()
                    .set("buyer", refTo("start_1", "buyer"))
                    .set("itemsList", refTo("start_1", "items"))
                    .set("q", refTo("start_1", "q")))
                .set("inputs", new JSONObject().set("type", "object").set("properties", new JSONObject()
                    .set("buyer", new JSONObject().set("type", "string"))
                    .set("itemsList", new JSONObject().set("type", "string"))
                    .set("q", new JSONObject().set("type", "string")))));
        JSONObject startData = new JSONObject().set("outputs", new JSONObject()
            .set("type", "object").set("properties", new JSONObject()
                .set("buyer", new JSONObject().set("type", "object"))
                .set("items", new JSONObject().set("type", "array"))
                .set("q", new JSONObject().set("type", "string"))));

        NodeDataNormalizer.propagateInputTypes(codeNode, id -> "start_1".equals(id) ? startData : null);

        JSONObject props = codeNode.getJSONObject("data").getJSONObject("inputs").getJSONObject("properties");
        assertEquals("object", props.getJSONObject("buyer").getStr("type"), "buyer 应从上游拷贝 object");
        assertEquals("array", props.getJSONObject("itemsList").getStr("type"), "itemsList 应从上游拷贝 array");
        assertEquals("string", props.getJSONObject("q").getStr("type"), "类型一致的保持不变");

        // 幂等：再跑一次不变；上游声明缺失时保持 string 占位
        NodeDataNormalizer.propagateInputTypes(codeNode, id -> null);
        assertEquals("object", props.getJSONObject("buyer").getStr("type"), "非 string 占位不被回退");
    }

    private static JSONObject refTo(String nodeId, String field) {
        return new JSONObject().set("type", "ref")
            .set("content", new JSONArray().set(nodeId).set(field));
    }

    @org.junit.jupiter.api.Test
    @DisplayName("对象输出声明引用驱动补全：buyer:{object} 被引用后自动补出 country/email（84bf1596 实证）")
    void objectOutputDeclarationsCompletedFromReferences() {
        JSONObject doc = new JSONObject().set("nodes", new JSONArray()
            .set(new JSONObject().set("id", "code_1").set("type", "code")
                .set("data", new JSONObject().set("outputs", new JSONObject().set("type", "object")
                    .set("properties", new JSONObject()
                        .set("buyer", new JSONObject().set("type", "object"))
                        .set("items", new JSONObject().set("type", "array"))))))
            .set(new JSONObject().set("id", "llm_1").set("type", "llm")
                .set("data", new JSONObject().set("inputsValues", new JSONObject()
                    .set("prompt", new JSONObject().set("type", "template")
                        .set("content", "国家：{{code_1.buyer.country}} 邮箱：{{code_1.buyer.email}} 数量：{{code_1.items.length}}"))))));

        NodeDataNormalizer.completeObjectOutputDeclarations(doc);

        JSONObject props = doc.getJSONArray("nodes").getJSONObject(0)
            .getJSONObject("data").getJSONObject("outputs").getJSONObject("properties");
        assertEquals("string", props.getJSONObject("buyer").getJSONObject("properties")
            .getJSONObject("country").getStr("type"));
        assertEquals("string", props.getJSONObject("buyer").getJSONObject("properties")
            .getJSONObject("email").getStr("type"));
        assertFalse(props.getJSONObject("items").containsKey("properties"),
            "length 是内置访问器，不给数组补声明");

        // 已声明的子字段不覆盖；非对象字段的越界引用不猜
        JSONObject doc2 = new JSONObject().set("nodes", new JSONArray()
            .set(new JSONObject().set("id", "code_1").set("type", "code")
                .set("data", new JSONObject().set("outputs", new JSONObject().set("type", "object")
                    .set("properties", new JSONObject()
                        .set("buyer", new JSONObject().set("type", "object").set("properties",
                            new JSONObject().set("country", new JSONObject().set("type", "number"))))
                            .set("plain", new JSONObject().set("type", "string"))))))
            .set(new JSONObject().set("id", "end_1").set("type", "end")
                .set("data", new JSONObject().set("inputsValues", new JSONObject()
                    .set("a", new JSONObject().set("type", "ref")
                        .set("content", new JSONArray().set("code_1").set("buyer").set("country")))
                    .set("b", new JSONObject().set("type", "ref")
                        .set("content", new JSONArray().set("code_1").set("plain").set("sub")))))));
        NodeDataNormalizer.completeObjectOutputDeclarations(doc2);
        JSONObject props2 = doc2.getJSONArray("nodes").getJSONObject(0)
            .getJSONObject("data").getJSONObject("outputs").getJSONObject("properties");
        assertEquals("number", props2.getJSONObject("buyer").getJSONObject("properties")
            .getJSONObject("country").getStr("type"), "已声明的子字段类型不覆盖");
        assertFalse(props2.getJSONObject("plain").containsKey("properties"),
            "string 字段的越界深引用不猜");
    }
}
