package cn.boommanpro.gaia.workflow.app.service;

import cn.hutool.json.JSONObject;
import cn.hutool.json.JSONUtil;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * http 节点形状统一回归（2026-10-16）：
 * 归一化必须产出引擎真实读取的规范形状（data.api/headersValues/body/timeout），
 * 否则会出现「校验放行、执行必坏」的形状分裂。
 */
class NodeDataNormalizerHttpTest {

    @Test
    @DisplayName("agent 扁平写法 → data.api/headersValues/body/timeout 规范形状")
    void flatFieldsBecomeCanonicalApiShape() {
        JSONObject data = JSONUtil.parseObj(
            "{\"method\":\"post\",\"url\":\"https://api.gaia.dev/hook\","
                + "\"headers\":{\"Authorization\":\"Bearer t\"},"
                + "\"params\":{\"q\":\"gaia\"},"
                + "\"body\":\"{\\\"k\\\":\\\"v\\\"}\","
                + "\"timeout\":8000}");

        NodeDataNormalizer.normalize("http", data);

        JSONObject api = data.getJSONObject("api");
        assertNotNull(api, "method/url 必须收进 data.api（引擎只读 api）");
        assertEquals("POST", api.getStr("method"));
        // 2026-10-25：url 裸字符串统一包成 template（表单控件按包装形状读取，引擎 parseUrl 双形状兼容）
        assertEquals("https://api.gaia.dev/hook", api.getJSONObject("url").getStr("content"));
        assertEquals("template", api.getJSONObject("url").getStr("type"));

        JSONObject headers = data.getJSONObject("headersValues");
        assertEquals("Bearer t", headers.getJSONObject("Authorization").getStr("content"),
            "headers 值必须包成 {type:constant,content}（引擎 parseValue 只认包装）");
        JSONObject params = data.getJSONObject("paramsValues");
        assertEquals("gaia", params.getJSONObject("q").getStr("content"));

        JSONObject body = data.getJSONObject("body");
        assertEquals("JSON", body.getStr("bodyType"));
        assertEquals("{\"k\":\"v\"}", body.getJSONObject("json").getStr("content"));

        assertEquals(8000, data.getJSONObject("timeout").getInt("timeout"));
        assertFalse(data.containsKey("inputsValues"), "http 引擎不读 inputsValues，不应残留");
    }

    @Test
    @DisplayName("旧版 inputsValues.url 死口径不再迁移（2026-10-24 全严格治理：引擎从不读，schema 直接拒）")
    void legacyInputsValuesShapeNoLongerMigrated() {
        JSONObject data = JSONUtil.parseObj(
            "{\"api\":{\"method\":\"GET\",\"url\":\"https://new.gaia.dev/api\"},"
                + "\"inputsValues\":{"
                + "\"url\":{\"type\":\"constant\",\"content\":\"https://old.gaia.dev/api\"},"
                + "\"timeout\":{\"type\":\"constant\",\"content\":3000}"
                + "}}");

        NodeDataNormalizer.normalize("http", data);

        JSONObject api = data.getJSONObject("api");
        assertEquals("https://new.gaia.dev/api", api.getJSONObject("url").getStr("content"),
            "data.api 优先（裸字符串归一为 template 包装），旧口径不再被搬进来");
        assertEquals("GET", api.getStr("method"));
        assertFalse(data.containsKey("timeout"), "旧口径 timeout 不再迁移");

        // 死字段原样保留 → 由严格契约按未知字段拒绝（additionalProperties:false）
        assertTrue(data.getJSONObject("inputsValues").containsKey("url"),
            "旧口径残留保留在原地，交给 schema 拒绝而不是静默搬家");
        assertFalse(NodeSchemaRegistry.validateParams("http", data.toString()).isEmpty(),
            "含 inputsValues 死字段的 http data 必须被严格契约拒绝");
    }

    @Test
    @DisplayName("headers/body 误放进 api（模型反复撞 additionalProperties）：搬回顶层并按规范归一")
    void misplacedKeysInsideApiAreLifted() {
        JSONObject data = JSONUtil.parseObj(
            "{\"api\":{\"method\":\"POST\",\"url\":\"https://httpbin.org/post\","
                + "\"headers\":{\"Content-Type\":\"application/json\"},"
                + "\"body\":{\"bodyType\":\"JSON\",\"json\":\"{\\\"a\\\":1}\"}}}");

        NodeDataNormalizer.normalize("http", data);

        JSONObject api = data.getJSONObject("api");
        assertFalse(api.containsKey("headers"));
        assertFalse(api.containsKey("body"));
        assertEquals("application/json",
            data.getJSONObject("headersValues").getJSONObject("Content-Type").getStr("content"));
        assertEquals("JSON", data.getJSONObject("body").getStr("bodyType"));
        assertEquals("template", data.getJSONObject("body").getJSONObject("json").getStr("type"));
    }

    @Test
    @DisplayName("规范形状但 body.json 是裸字符串：包成 template，{{ }} 才会渲染（2026-10-24 物流单实证）")
    void canonicalBodyWithRawJsonStringBecomesTemplate() {
        JSONObject data = JSONUtil.parseObj(
            "{\"api\":{\"method\":\"POST\",\"url\":\"https://httpbin.org/post\"},"
                + "\"body\":{\"bodyType\":\"JSON\",\"json\":\"{\\\"orderId\\\":\\\"{{start_1.orderId}}\\\"}\"}}");

        NodeDataNormalizer.normalize("http", data);

        JSONObject json = data.getJSONObject("body").getJSONObject("json");
        assertEquals("template", json.getStr("type"));
        assertTrue(json.getStr("content").contains("start_1.orderId"), json.getStr("content"));
        assertEquals("JSON", data.getJSONObject("body").getStr("bodyType"));
    }

    @Test
    @DisplayName("已是规范形状的数据不被破坏（画布 UI 产出直通）")
    void canonicalShapeUntouched() {
        JSONObject data = JSONUtil.parseObj(
            "{\"api\":{\"method\":\"GET\",\"url\":{\"type\":\"constant\",\"content\":\"https://httpbin.org/get\"}},"
                + "\"headersValues\":{\"X-Test\":{\"type\":\"constant\",\"content\":\"gaia\"}},"
                + "\"body\":{\"bodyType\":\"none\"},"
                + "\"timeout\":{\"timeout\":5000,\"retryTimes\":0}}");

        NodeDataNormalizer.normalize("http", data);

        assertEquals("GET", data.getJSONObject("api").getStr("method"));
        assertEquals("https://httpbin.org/get",
            data.getJSONObject("api").getJSONObject("url").getStr("content"));
        assertEquals("none", data.getJSONObject("body").getStr("bodyType"));
        assertEquals(0, data.getJSONObject("timeout").getInt("retryTimes"));
    }

    @Test
    @DisplayName("归一化后校验放行：扁平 url 节点经 normalize 后 businessFieldIssues 为空")
    void canonicalizerAcceptsFlatUrlAfterNormalize() {
        String dsl = "{\"nodes\":["
            + "{\"id\":\"start_0\",\"type\":\"start\",\"data\":{\"outputs\":{\"type\":\"object\",\"properties\":{\"q\":{\"type\":\"string\"}}}},\"meta\":{\"position\":{\"x\":0,\"y\":0}}},"
            + "{\"id\":\"http_0\",\"type\":\"http\",\"data\":{\"title\":\"请求\",\"method\":\"GET\",\"url\":\"https://real.gaia.dev/api\"},\"meta\":{\"position\":{\"x\":1,\"y\":0}}},"
            + "{\"id\":\"end_0\",\"type\":\"end\",\"data\":{\"inputsValues\":{\"out\":{\"type\":\"ref\",\"content\":[\"http_0\",\"body\"]}}},\"meta\":{\"position\":{\"x\":2,\"y\":0}}}"
            + "],\"edges\":["
            + "{\"sourceNodeID\":\"start_0\",\"targetNodeID\":\"http_0\"},"
            + "{\"sourceNodeID\":\"http_0\",\"targetNodeID\":\"end_0\"}]}";

        WorkflowDslCanonicalizer.Result result = WorkflowDslCanonicalizer.canonicalize(dsl);
        assertNotNull(result.getJson(), "合法扁平 http 工作流不应被拒，repairs=" + result.getRepairs());
        assertTrue(result.getFatalIssues().isEmpty(),
            "扁平 url 归一化后不应再报缺配置，实际: " + result.getFatalIssues());

        // 落库后的 JSON 里 http 节点必须是 api 形状（引擎可执行）；
        // url 归一为 template 包装（2026-10-25，表单控件按包装形状读取）
        JSONObject saved = JSONUtil.parseObj(result.getJson());
        for (Object item : saved.getJSONArray("nodes")) {
            JSONObject node = (JSONObject) item;
            if ("http".equals(node.getStr("type"))) {
                JSONObject api = node.getJSONObject("data").getJSONObject("api");
                assertNotNull(api, "落库数据必须是 data.api 形状");
                assertEquals("https://real.gaia.dev/api", api.getJSONObject("url").getStr("content"));
                assertEquals("template", api.getJSONObject("url").getStr("type"));
            }
        }
    }

    @Test
    @DisplayName("彻底缺 url 的 http 节点 → fatal 且修复示例为 api 形状")
    void missingUrlIsFatalWithApiShapeHint() {
        String dsl = "{\"nodes\":["
            + "{\"id\":\"start_0\",\"type\":\"start\",\"data\":{\"outputs\":{\"type\":\"object\",\"properties\":{\"q\":{\"type\":\"string\"}}}},\"meta\":{\"position\":{\"x\":0,\"y\":0}}},"
            + "{\"id\":\"http_0\",\"type\":\"http\",\"data\":{\"title\":\"请求\"},\"meta\":{\"position\":{\"x\":1,\"y\":0}}}"
            + "],\"edges\":[]}";

        WorkflowDslCanonicalizer.Result result = WorkflowDslCanonicalizer.canonicalize(dsl);
        List<String> fatal = result.getFatalIssues();
        assertFalse(fatal.isEmpty(), "缺 url 必须 fatal");
        assertTrue(fatal.get(0).contains("\"api\":{\"method\""),
            "修复示例必须是 data.api 形状，实际: " + fatal.get(0));
    }
}
