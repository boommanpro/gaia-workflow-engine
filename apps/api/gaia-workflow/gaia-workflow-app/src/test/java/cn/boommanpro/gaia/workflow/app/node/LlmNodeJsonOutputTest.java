package cn.boommanpro.gaia.workflow.app.node;

import cn.boommanpro.gaia.workflow.base.GaiaWorkflow;
import cn.hutool.json.JSONArray;
import cn.hutool.json.JSONObject;
import cn.hutool.json.JSONUtil;
import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.atomic.AtomicReference;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * llm 节点 json 输出模式契约（2026-10-25 outputMode=text/json）：
 * · json 模式：模型输出的 JSON（含 markdown 围栏）被解析成 outputs.properties 声明字段，
 *   下游直接引用 llm_x.<字段>（不再需要 code 节点 JSON.parse）；
 * · 声明字段即运行时白名单（引擎 parseOutputResult 过滤，机制与 code 一致）；
 * · 模型输出无法解析为 JSON 对象 → 节点 FAILED（不静默 null）；
 * · text 模式（默认）行为不变：固定 result。
 */
@DisplayName("llm 节点 json 输出模式（mock OpenAI 服务）")
class LlmNodeJsonOutputTest extends AbstractNodeTest {

    private HttpServer server;
    private final AtomicReference<String> llmContent = new AtomicReference<>("no-json");

    @BeforeEach
    void startServer() throws IOException {
        server = HttpServer.create(new InetSocketAddress(0), 0);
        server.createContext("/v1/chat/completions", exchange -> {
            String resp = "{\"choices\":[{\"message\":{\"role\":\"assistant\","
                + "\"content\":" + JSONUtil.toJsonStr(llmContent.get()) + "}}],\"usage\":{\"total_tokens\":1}}";
            byte[] out = resp.getBytes(StandardCharsets.UTF_8);
            exchange.getResponseHeaders().set("Content-Type", "application/json");
            exchange.sendResponseHeaders(200, out.length);
            try (OutputStream os = exchange.getResponseBody()) {
                os.write(out);
            }
        });
        server.start();
    }

    @AfterEach
    void stopServer() {
        if (server != null) {
            server.stop(0);
        }
    }

    private JSONObject llmJsonNode() {
        return new JSONObject()
            .set("id", "llm_0").set("type", "llm")
            .set("meta", new JSONObject().set("position", new JSONObject().set("x", 1).set("y", 0)))
            .set("data", new JSONObject()
                .set("outputMode", "json")
                .set("inputsValues", new JSONObject()
                    .set("modelName", new JSONObject().set("type", "constant").set("content", "mock-model"))
                    .set("apiKey", new JSONObject().set("type", "constant").set("content", "sk-test"))
                    .set("apiHost", new JSONObject().set("type", "constant")
                        .set("content", "http://127.0.0.1:" + server.getAddress().getPort() + "/v1"))
                    .set("prompt", new JSONObject().set("type", "template")
                        .set("content", "评估：{{ start_0.query }}")))
                .set("outputs", new JSONObject().set("type", "object").set("properties", new JSONObject()
                    .set("riskLevel", new JSONObject().set("type", "string"))
                    .set("score", new JSONObject().set("type", "number")))));
    }

    /** start → llm(json) → end（end 引用 llm_0.riskLevel —— json 模式声明字段直接可引用） */
    private String workflowJson(JSONObject llmNode) {
        JSONObject doc = new JSONObject();
        JSONArray nodes = new JSONArray();
        nodes.set(new JSONObject()
            .set("id", "start_0").set("type", "start")
            .set("meta", new JSONObject().set("position", new JSONObject().set("x", 0).set("y", 0)))
            .set("data", new JSONObject().set("outputs", new JSONObject().set("type", "object")
                .set("properties", new JSONObject().set("query",
                    new JSONObject().set("type", "string").set("default", "订单 600 美元"))))));
        nodes.set(llmNode);
        nodes.set(new JSONObject()
            .set("id", "end_0").set("type", "end")
            .set("meta", new JSONObject().set("position", new JSONObject().set("x", 2).set("y", 0)))
            .set("data", new JSONObject()
                .set("inputsValues", new JSONObject()
                    .set("level", new JSONObject().set("type", "ref")
                        .set("content", new JSONArray().set("llm_0").set("riskLevel")))
                    .set("score", new JSONObject().set("type", "ref")
                        .set("content", new JSONArray().set("llm_0").set("score"))))
                .set("inputs", new JSONObject().set("type", "object").set("properties", new JSONObject()
                    .set("level", new JSONObject().set("type", "string"))
                    .set("score", new JSONObject().set("type", "number"))))));
        doc.set("nodes", nodes);
        doc.set("edges", new JSONArray()
            .set(new JSONObject().set("sourceNodeID", "start_0").set("targetNodeID", "llm_0"))
            .set(new JSONObject().set("sourceNodeID", "llm_0").set("targetNodeID", "end_0")));
        return doc.toString();
    }

    @Test
    @DisplayName("json 模式：模型输出（裸 JSON）解析成声明字段，下游直接引用")
    void plainJsonOutputFlowsToDownstream() {
        llmContent.set("{\"riskLevel\":\"高\",\"score\":88}");
        Map<String, Object> result = new GaiaWorkflow(workflowJson(llmJsonNode())).run(new HashMap<>());
        assertEquals("高", result.get("level"));
        assertEquals(88, result.get("score"));
    }

    @Test
    @DisplayName("json 模式容错：markdown 围栏包裹的 JSON 也能解析")
    void fencedJsonOutputParsed() {
        llmContent.set("评估结果如下：\n```json\n{\"riskLevel\": \"中\", \"score\": 55}\n```\n请参考");
        Map<String, Object> result = new GaiaWorkflow(workflowJson(llmJsonNode())).run(new HashMap<>());
        assertEquals("中", result.get("level"));
        assertEquals(55, result.get("score"));
    }

    @Test
    @DisplayName("json 模式：模型输出不是 JSON → 节点 FAILED（不静默 null 假成功）")
    void nonJsonOutputFailsTheNode() {
        llmContent.set("这是一段普通文本，不是 JSON");
        GaiaWorkflow wf = new GaiaWorkflow(workflowJson(llmJsonNode()));
        // 链级：节点失败向上抛（工作流终态非成功，同步 run 不返回半成品结果）
        assertThrows(Exception.class, () -> wf.run(new HashMap<>()));
        // 节点级：报告携带原始语义（agent 试跑链路按此回传错误文案）
        GaiaWorkflow.NodeReport report = wf.getNodeReports().get("llm_0");
        assertTrue(String.valueOf(report.getStatus()).contains("FAIL"), "节点应 FAILED: " + report.getStatus());
        Object snapshot = report.getSnapshots().isEmpty() ? null : report.getSnapshots().get(0);
        String errorText = snapshot instanceof Map ? String.valueOf(((Map<?, ?>) snapshot).get("error")) : "";
        assertTrue(errorText.contains("无法解析为 JSON"), "错误应说明 JSON 解析失败: " + errorText);
    }

    @Test
    @DisplayName("声明字段即白名单：模型多输出的未声明键不进 memory（与 code 节点同机制）")
    void undeclaredFieldsFiltered() {
        llmContent.set("{\"riskLevel\":\"低\",\"score\":10,\"secret\":\"leak\"}");
        // end 增加对未声明字段 secret 的引用：白名单过滤后应解析为 null
        JSONObject doc = JSONUtil.parseObj(workflowJson(llmJsonNode()));
        JSONObject endData = doc.getJSONArray("nodes").getJSONObject(2).getJSONObject("data");
        endData.getJSONObject("inputsValues").set("leakCheck", new JSONObject().set("type", "ref")
            .set("content", new JSONArray().set("llm_0").set("secret")));
        endData.getJSONObject("inputs").getJSONObject("properties")
            .set("leakCheck", new JSONObject().set("type", "string"));
        Map<String, Object> result = new GaiaWorkflow(doc.toString()).run(new HashMap<>());
        assertEquals("低", result.get("level"));
        assertEquals(10, result.get("score"));
        assertTrue(result.get("leakCheck") == null || "".equals(result.get("leakCheck")),
            "未声明键不得进 memory: " + result.get("leakCheck"));
    }

    @Test
    @DisplayName("text 模式（默认，无 outputMode）行为不变：固定 result")
    void textModeUnchanged() {
        llmContent.set("plain reply");
        // text 模式节点：同 inputsValues 但无 outputMode/outputs 声明
        JSONObject textNode = new JSONObject()
            .set("id", "llm_0").set("type", "llm")
            .set("meta", new JSONObject().set("position", new JSONObject().set("x", 1).set("y", 0)))
            .set("data", new JSONObject()
                .set("inputsValues", llmJsonNode().getJSONObject("data").getJSONObject("inputsValues")));
        JSONObject doc = JSONUtil.parseObj(workflowJson(textNode));
        // end 改引用 llm_0.result（text 模式固定输出）
        JSONObject endValues = doc.getJSONArray("nodes").getJSONObject(2).getJSONObject("data").getJSONObject("inputsValues");
        endValues.set("level", new JSONObject().set("type", "ref").set("content", new JSONArray().set("llm_0").set("result")));
        endValues.remove("score");
        doc.getJSONArray("nodes").getJSONObject(2).getJSONObject("data").getJSONObject("inputs").getJSONObject("properties")
            .remove("score");
        Map<String, Object> result = new GaiaWorkflow(doc.toString()).run(new HashMap<>());
        assertEquals("plain reply", result.get("level"));
    }
}
