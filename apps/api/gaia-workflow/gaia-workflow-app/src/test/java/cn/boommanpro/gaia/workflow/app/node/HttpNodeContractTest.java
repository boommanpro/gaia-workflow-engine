package cn.boommanpro.gaia.workflow.app.node;

import cn.boommanpro.gaia.workflow.app.service.NodeDataNormalizer;
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
import java.io.InputStream;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.atomic.AtomicReference;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * http 节点契约测试（真实 socket）：此前只有「不可达时优雅降级」的测试，
 * 从未断言过请求真正到达对端——method/headers/body 契约零覆盖。
 * 同时钉住 2026-10-16 的形状统一：agent 扁平写法经归一化后必须可直接执行。
 */
@DisplayName("http 节点契约（本地假服务）")
class HttpNodeContractTest extends AbstractNodeTest {

    private HttpServer server;
    private final AtomicReference<String> receivedMethod = new AtomicReference<>();
    private final AtomicReference<String> receivedPath = new AtomicReference<>();
    private final AtomicReference<String> receivedBody = new AtomicReference<>();
    private final AtomicReference<String> receivedAuthHeader = new AtomicReference<>();

    @BeforeEach
    void startServer() throws IOException {
        server = HttpServer.create(new InetSocketAddress(0), 0);
        server.createContext("/api/hook", exchange -> {
            receivedMethod.set(exchange.getRequestMethod());
            receivedPath.set(exchange.getRequestURI().getPath());
            receivedAuthHeader.set(exchange.getRequestHeaders().getFirst("Authorization"));
            byte[] body;
            try (InputStream in = exchange.getRequestBody()) {
                body = in.readAllBytes();
            }
            receivedBody.set(new String(body, StandardCharsets.UTF_8));
            byte[] resp = "{\"ok\":true}".getBytes(StandardCharsets.UTF_8);
            exchange.sendResponseHeaders(200, resp.length);
            exchange.getResponseBody().write(resp);
            exchange.close();
        });
        server.start();
    }

    @AfterEach
    void stopServer() {
        if (server != null) {
            server.stop(0);
        }
    }

    private String host() {
        return "http://127.0.0.1:" + server.getAddress().getPort();
    }

    @Test
    @DisplayName("规范形状（data.api）端到端：method/headers/body 到达对端，end 拿到 body/statusCode")
    void canonicalShapeEndToEnd() {
        JSONObject httpData = new JSONObject()
            .set("title", "推送")
            .set("api", new JSONObject().set("method", "POST").set("url", host() + "/api/hook"))
            .set("headersValues", new JSONObject()
                .set("Authorization", new JSONObject().set("type", "constant").set("content", "Bearer gaia-test")))
            .set("body", new JSONObject()
                .set("bodyType", "JSON")
                .set("json", new JSONObject().set("type", "template").set("content", "{\"k\":\"{{ start_0.query }}\"}")))
            .set("timeout", new JSONObject().set("timeout", 5000).set("retryTimes", 1))
            .set("outputs", new JSONObject().set("type", "object").set("properties", new JSONObject()
                .set("body", new JSONObject().set("type", "string"))
                .set("statusCode", new JSONObject().set("type", "integer"))));

        Map<String, Object> result = runStartHttpEnd(httpData, "gaia");

        assertEquals("POST", receivedMethod.get());
        assertEquals("/api/hook", receivedPath.get());
        assertEquals("Bearer gaia-test", receivedAuthHeader.get());
        assertEquals("{\"k\":\"gaia\"}", receivedBody.get());
        assertEquals("{\"ok\":true}", result.get("body"), "end 应引用 http 的 body 输出");
        assertNotNull(result.get("statusCode"), "end 应能拿到 statusCode");
    }

    @Test
    @DisplayName("agent 扁平写法经 NodeDataNormalizer 归一化后同样可执行（P0-2 引擎级回归）")
    void flatAgentShapeExecutesAfterNormalize() {
        JSONObject httpData = new JSONObject()
            .set("title", "推送")
            .set("method", "POST")
            .set("url", host() + "/api/hook")
            .set("headers", new JSONObject().set("Authorization", "Bearer gaia-flat"))
            .set("body", "{\"from\":\"flat\"}");
        NodeDataNormalizer.normalize("http", httpData);
        assertTrue(httpData.containsKey("api"), "归一化必须产出 data.api");

        Map<String, Object> result = runStartHttpEnd(httpData, "x");

        assertEquals("POST", receivedMethod.get());
        assertEquals("Bearer gaia-flat", receivedAuthHeader.get());
        assertEquals("{\"from\":\"flat\"}", receivedBody.get());
        assertEquals("{\"ok\":true}", result.get("body"));
    }

    /** 组装 start → http → end 工作流并执行，返回 end 输出 */
    private Map<String, Object> runStartHttpEnd(JSONObject httpData, String queryValue) {
        JSONObject doc = new JSONObject();
        JSONArray nodes = new JSONArray();
        nodes.set(new JSONObject()
            .set("id", "start_0").set("type", "start")
            .set("meta", new JSONObject().set("position", new JSONObject().set("x", 0).set("y", 0)))
            .set("data", new JSONObject().set("outputs", new JSONObject().set("type", "object")
                .set("properties", new JSONObject().set("query",
                    new JSONObject().set("type", "string").set("default", queryValue))))));
        JSONObject httpNode = new JSONObject()
            .set("id", "http_0").set("type", "http")
            .set("meta", new JSONObject().set("position", new JSONObject().set("x", 1).set("y", 0)))
            .set("data", httpData);
        nodes.set(httpNode);
        nodes.set(new JSONObject()
            .set("id", "end_0").set("type", "end")
            .set("meta", new JSONObject().set("position", new JSONObject().set("x", 2).set("y", 0)))
            .set("data", new JSONObject()
                .set("inputsValues", new JSONObject()
                    .set("body", new JSONObject().set("type", "ref").set("content", new JSONArray().set("http_0").set("body")))
                    .set("statusCode", new JSONObject().set("type", "ref").set("content", new JSONArray().set("http_0").set("statusCode"))))
                .set("inputs", new JSONObject().set("type", "object").set("properties", new JSONObject()
                    .set("body", new JSONObject().set("type", "string"))
                    .set("statusCode", new JSONObject().set("type", "integer"))))));
        doc.set("nodes", nodes);
        doc.set("edges", new JSONArray()
            .set(new JSONObject().set("sourceNodeID", "start_0").set("targetNodeID", "http_0"))
            .set(new JSONObject().set("sourceNodeID", "http_0").set("targetNodeID", "end_0")));

        GaiaWorkflow wf = new GaiaWorkflow(doc.toString());
        Map<String, Object> inputs = new HashMap<>();
        inputs.put("query", "gaia");
        return wf.run(inputs);
    }
}
