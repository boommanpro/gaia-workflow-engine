package cn.boommanpro.gaia.workflow.infra.extend.node.llm;

import cn.boommanpro.gaia.workflow.infra.extend.node.llm.LlmNode.TimeoutConfig;
import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.Test;

import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * LLM 节点 retryTimes 重试（第一档 H1）：
 * 字段此前在 TimeoutConfig 里解析了但从未消费——配置了重试次数也不生效。
 * 用 JDK 内置 HttpServer 做桩：前两次 500、第三次成功，验证真实重试 + 成功路径。
 */
class LlmNodeRetryTest {

    private static LlmNode llmNode(String host, int retries) {
        LlmNode node = new LlmNode();
        node.setId("llm_retry_1");
        Map<String, Object> inputs = new HashMap<>();
        inputs.put("modelName", constant("test-model"));
        inputs.put("apiKey", constant("sk-test"));
        inputs.put("apiHost", constant(host));
        inputs.put("prompt", constant("hi"));
        node.setInputsValues(inputs);
        TimeoutConfig timeout = new TimeoutConfig();
        timeout.setTimeout(3000);
        timeout.setRetryTimes(retries);
        node.setTimeout(timeout);
        return node;
    }

    private static Map<String, Object> constant(String value) {
        Map<String, Object> v = new HashMap<>();
        v.put("type", "constant");
        v.put("content", value);
        return v;
    }

    @Test
    void retryTimesShouldRetryUntilSuccess() throws Exception {
        AtomicInteger hits = new AtomicInteger();
        HttpServer server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/v1", exchange -> {
            int n = hits.incrementAndGet();
            byte[] body = (n <= 2
                ? "{\"error\":\"upstream boom\"}"
                : "{\"choices\":[{\"message\":{\"content\":\"ok-after-retry\"}}]}")
                .getBytes(StandardCharsets.UTF_8);
            exchange.sendResponseHeaders(n <= 2 ? 500 : 200, body.length);
            try (OutputStream out = exchange.getResponseBody()) {
                out.write(body);
            }
        });
        server.start();
        try {
            LlmNode node = llmNode(
                "http://127.0.0.1:" + server.getAddress().getPort() + "/v1", 2);
            Map<String, Object> result = node.execute(null);
            assertEquals("ok-after-retry", result.get("result"));
            assertEquals(3, hits.get(), "retryTimes=2 应总尝试 3 次");
        } finally {
            server.stop(0);
        }
    }

    @Test
    void allRetriesExhaustedShouldThrow() throws Exception {
        AtomicInteger hits = new AtomicInteger();
        HttpServer server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/v1", exchange -> {
            hits.incrementAndGet();
            byte[] body = "{\"error\":\"always down\"}".getBytes(StandardCharsets.UTF_8);
            exchange.sendResponseHeaders(500, body.length);
            try (OutputStream out = exchange.getResponseBody()) {
                out.write(body);
            }
        });
        server.start();
        try {
            LlmNode node = llmNode(
                "http://127.0.0.1:" + server.getAddress().getPort() + "/v1", 1);
            // 新错误语义（第一档 A）：重试耗尽必须上抛，由引擎置节点 FAILED——
            // 不再吞成 result.error 字段假成功
            RuntimeException ex = assertThrows(RuntimeException.class, () -> node.execute(null));
            assertTrue(ex.getMessage() != null || ex.getCause() != null);
            assertEquals(2, hits.get(), "retryTimes=1 应总尝试 2 次");
        } finally {
            server.stop(0);
        }
    }

    @Test
    void zeroRetriesShouldFailFast() throws Exception {
        AtomicInteger hits = new AtomicInteger();
        HttpServer server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/v1", exchange -> {
            hits.incrementAndGet();
            byte[] body = "{\"error\":\"down\"}".getBytes(StandardCharsets.UTF_8);
            exchange.sendResponseHeaders(500, body.length);
            try (OutputStream out = exchange.getResponseBody()) {
                out.write(body);
            }
        });
        server.start();
        try {
            LlmNode node = llmNode(
                "http://127.0.0.1:" + server.getAddress().getPort() + "/v1", 0);
            assertThrows(RuntimeException.class, () -> node.execute(null));
            assertEquals(1, hits.get(), "retryTimes=0 只尝试 1 次（默认行为不变）");
        } finally {
            server.stop(0);
        }
    }
}
