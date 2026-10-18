package cn.boommanpro.gaia.workflow.app.node;

import cn.boommanpro.gaia.workflow.base.GaiaWorkflow;
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
import static org.junit.jupiter.api.Assumptions.assumeTrue;

/**
 * 基准模式 P2（智能处理：start → llm → code 后处理 → end）。
 * <p>
 * 两条腿：
 * <ol>
 *   <li>确定性：本地 mock OpenAI 服务验证 llm→code 引用链与后处理语义（离线可跑）</li>
 *   <li>真实 API：dmxapi 免费 glm-4-flash（{@link FreeLlmContract}，key 仅可用该免费模型），
 *       验证夹具端到端可执行；断言对模型输出内容宽容（只断非空/长度），避免脆弱回归</li>
 * </ol>
 */
@DisplayName("P2 智能处理模式：start → llm → code(后处理) → end")
class PatternP2LlmCodeFlowTest extends AbstractNodeTest {

    private static final String MOCK_REPLY = "mock-llm-reply";

    private HttpServer server;
    private final AtomicReference<String> receivedBody = new AtomicReference<>();

    @BeforeEach
    void startServer() throws IOException {
        server = HttpServer.create(new InetSocketAddress(0), 0);
        server.createContext("/v1/chat/completions", exchange -> {
            receivedBody.set(new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8));
            String resp = "{\"choices\":[{\"message\":{\"role\":\"assistant\","
                + "\"content\":\"" + MOCK_REPLY + "\"}}],\"usage\":{\"total_tokens\":1}}";
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
    @DisplayName("确定性链路：llm 输出经 code 节点加工（大写+字数）落 end")
    void llmThenCodeDeterministic() {
        GaiaWorkflow wf = new GaiaWorkflow(deterministicDoc());
        Map<String, Object> result = wf.run(map("query", "把这句话原样返回"));

        // 请求契约：prompt 模板渲染了上游输入
        JSONObject request = JSONUtil.parseObj(receivedBody.get());
        assertTrue(String.valueOf(request.getJSONArray("messages")).contains("把这句话原样返回"),
            "prompt 应渲染上游 query: " + receivedBody.get());

        // 后处理契约：code 节点消费 llm.result 并产出结构化字段（reply 原文 + chars 字数）
        assertEquals(MOCK_REPLY, result.get("reply"));
        assertEquals(MOCK_REPLY.length(), ((Number) result.get("chars")).intValue());
    }

    @Test
    @DisplayName("真实免费 API：glm-4-flash @ dmxapi 端到端（离线自动跳过）")
    void llmThenCodeWithFreeRealApi() {
        assumeTrue(FreeLlmContract.reachable(), "dmxapi 不可达，跳过真实 API 用例");

        GaiaWorkflow wf = new GaiaWorkflow(loadWorkflowJson("p2-llm-code-flow"));
        Map<String, Object> result = wf.run(new HashMap<>());

        assertNotNull(result, "真实 API 工作流应正常返回");
        String reply = String.valueOf(result.get("reply"));
        assertTrue(reply != null && !reply.isBlank(), "llm→code 链路应产出非空回复: " + result);
        assertTrue(((Number) result.get("chars")).intValue() >= 1, "字数统计应大于 0: " + result);
    }

    // ------------------------------------------------------------------

    /** 与 p2-llm-code-flow.json 夹具同构，仅 apiHost/model 指向本地 mock 服务。 */
    private String deterministicDoc() {
        JSONObject doc = JSONUtil.parseObj(loadWorkflowJson("p2-llm-code-flow"));
        JSONObject llm = doc.getJSONArray("nodes").getJSONObject(1);
        llm.getJSONObject("data").getJSONObject("inputsValues")
            .set("modelName", new JSONObject().set("type", "constant").set("content", "mock-model"))
            .set("apiHost", new JSONObject().set("type", "constant")
                .set("content", "http://127.0.0.1:" + server.getAddress().getPort() + "/v1"))
            .set("apiKey", new JSONObject().set("type", "constant").set("content", "sk-test"));
        return doc.toString();
    }

    private static Map<String, Object> map(String k, Object v) {
        Map<String, Object> m = new HashMap<>();
        m.put(k, v);
        return m;
    }
}
