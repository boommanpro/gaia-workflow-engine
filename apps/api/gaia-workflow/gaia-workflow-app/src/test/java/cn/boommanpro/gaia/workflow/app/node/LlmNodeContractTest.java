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
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * llm 节点契约测试（本地 mock OpenAI 服务）：此前只有「不可达时优雅降级」，
 * 从未断言过请求体形状（model/temperature/prompt 模板渲染）与响应落 memory——零覆盖。
 */
@DisplayName("llm 节点契约（mock OpenAI 服务）")
class LlmNodeContractTest extends AbstractNodeTest {

    private HttpServer server;
    private final AtomicReference<String> receivedAuth = new AtomicReference<>();
    private final AtomicReference<String> receivedBody = new AtomicReference<>();

    @BeforeEach
    void startServer() throws IOException {
        server = HttpServer.create(new InetSocketAddress(0), 0);
        server.createContext("/v1/chat/completions", exchange -> {
            receivedAuth.set(exchange.getRequestHeaders().getFirst("Authorization"));
            byte[] body = exchange.getRequestBody().readAllBytes();
            receivedBody.set(new String(body, StandardCharsets.UTF_8));
            String resp = "{\"choices\":[{\"message\":{\"role\":\"assistant\","
                + "\"content\":\"mock-llm-reply\"}}],\"usage\":{\"total_tokens\":1}}";
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

    @Test
    @DisplayName("请求体契约：model/temperature/messages 到位，prompt 模板渲染上游输出，result 落 end")
    void llmRequestShapeAndOutput() {
        JSONObject llmData = new JSONObject()
            .set("title", "总结")
            .set("inputsValues", new JSONObject()
                .set("modelName", new JSONObject().set("type", "constant").set("content", "mock-model"))
                .set("apiKey", new JSONObject().set("type", "constant").set("content", "sk-test"))
                .set("apiHost", new JSONObject().set("type", "constant")
                    .set("content", "http://127.0.0.1:" + server.getAddress().getPort() + "/v1"))
                .set("temperature", new JSONObject().set("type", "constant").set("content", 0.3))
                .set("prompt", new JSONObject().set("type", "template")
                    .set("content", "总结以下文本：{{ start_0.query }}")));

        JSONObject doc = new JSONObject();
        JSONArray nodes = new JSONArray();
        nodes.set(new JSONObject()
            .set("id", "start_0").set("type", "start")
            .set("meta", new JSONObject().set("position", new JSONObject().set("x", 0).set("y", 0)))
            .set("data", new JSONObject().set("outputs", new JSONObject().set("type", "object")
                .set("properties", new JSONObject().set("query",
                    new JSONObject().set("type", "string").set("default", "Gaia 是一个工作流引擎"))))));
        nodes.set(new JSONObject()
            .set("id", "llm_0").set("type", "llm")
            .set("meta", new JSONObject().set("position", new JSONObject().set("x", 1).set("y", 0)))
            .set("data", llmData));
        nodes.set(new JSONObject()
            .set("id", "end_0").set("type", "end")
            .set("meta", new JSONObject().set("position", new JSONObject().set("x", 2).set("y", 0)))
            .set("data", new JSONObject()
                .set("inputsValues", new JSONObject()
                    .set("output", new JSONObject().set("type", "ref")
                        .set("content", new JSONArray().set("llm_0").set("result"))))
                .set("inputs", new JSONObject().set("type", "object").set("properties", new JSONObject()
                    .set("output", new JSONObject().set("type", "string"))))));
        doc.set("nodes", nodes);
        doc.set("edges", new JSONArray()
            .set(new JSONObject().set("sourceNodeID", "start_0").set("targetNodeID", "llm_0"))
            .set(new JSONObject().set("sourceNodeID", "llm_0").set("targetNodeID", "end_0")));

        GaiaWorkflow wf = new GaiaWorkflow(doc.toString());
        Map<String, Object> result = wf.run(new HashMap<>());

        // 请求契约
        assertEquals("Bearer sk-test", receivedAuth.get());
        JSONObject request = JSONUtil.parseObj(receivedBody.get());
        assertEquals("mock-model", request.getStr("model"));
        assertEquals(0.3, request.getDouble("temperature"), 0.0001);
        JSONArray messages = request.getJSONArray("messages");
        assertNotNull(messages);
        boolean promptRendered = false;
        for (Object item : messages) {
            JSONObject message = (JSONObject) item;
            if ("user".equals(message.getStr("role"))
                && String.valueOf(message.get("content")).contains("Gaia 是一个工作流引擎")) {
                promptRendered = true;
            }
        }
        assertTrue(promptRendered, "prompt 模板应渲染上游输出: " + receivedBody.get());

        // 输出契约：llm 输出键是 result（模板/知识库口径一致）
        assertEquals("mock-llm-reply", result.get("output"));
    }
}
