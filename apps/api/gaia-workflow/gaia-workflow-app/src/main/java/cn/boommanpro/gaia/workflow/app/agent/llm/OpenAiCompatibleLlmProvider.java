package cn.boommanpro.gaia.workflow.app.agent.llm;

import cn.boommanpro.gaia.workflow.app.service.AgentModelConfigService;
import cn.hutool.json.JSONArray;
import cn.hutool.json.JSONObject;
import cn.hutool.json.JSONUtil;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;

/**
 * OpenAI 兼容协议的 LLM 供应商实现。
 *
 * <p>把原先重复三遍的裸 HTTP 调用收敛成一处：
 * 任何暴露 OpenAI chat/completions 接口的服务（本地 LM Studio、vLLM、各家云厂商）
 * 都可以直接用这个实现，换模型不用改代码。</p>
 *
 * <p>细节说明：</p>
 * <ul>
 *   <li>配置每次调用实时读取 {@code AgentModelConfigService}，改了配置立即生效</li>
 *   <li>流式增量拼接 args：模型可能把一次工具调用的参数切成多个 chunk</li>
 *   <li>对模型吐出的非法 JSON 参数做尽力修复（补齐引号/括号）</li>
 * </ul>
 */
@Slf4j
@Component
public class OpenAiCompatibleLlmProvider implements LlmProvider {

    public static final String PROVIDER_ID = "openai-compatible";

    private final AgentModelConfigService modelConfigService;

    public OpenAiCompatibleLlmProvider(AgentModelConfigService modelConfigService) {
        this.modelConfigService = modelConfigService;
    }

    @Override
    public String getId() {
        return PROVIDER_ID;
    }

    @Override
    public String getName() {
        return "OpenAI Compatible";
    }

    @Override
    public boolean isAvailable() {
        try {
            AgentModelConfigService.LlmConfig cfg = modelConfigService.getLlmConfig();
            return cfg.getApiHost() != null && !cfg.getApiHost().isEmpty()
                && cfg.getModel() != null && !cfg.getModel().isEmpty();
        } catch (Exception e) {
            return false;
        }
    }

    @Override
    public LlmChatResponse chat(LlmChatRequest request) {
        return chat(request, null);
    }

    @Override
    public LlmChatResponse chat(LlmChatRequest request, TokenListener listener) {
        long start = System.currentTimeMillis();
        AgentModelConfigService.LlmConfig cfg = modelConfigService.getLlmConfig();

        try {
            JSONObject body = new JSONObject();
            body.set("model", cfg.getModel());
            body.set("messages", buildMessages(request));
            body.set("stream", request.isStream());
            body.set("temperature",
                request.getTemperature() != null ? request.getTemperature() : cfg.getTemperature());
            if (request.getMaxTokens() > 0) {
                body.set("max_tokens", request.getMaxTokens());
            } else if (cfg.getMaxTokens() > 0) {
                body.set("max_tokens", cfg.getMaxTokens());
            }
            if (request.getTools() != null && !request.getTools().isEmpty()) {
                body.set("tools", request.getTools());
            }

            HttpURLConnection conn = openConnection(cfg, body);
            int code = conn.getResponseCode();
            if (code != 200) {
                String err = readAll(conn.getErrorStream());
                log.error("[llm] request failed: {} {}", code, err);
                return LlmChatResponse.failed("LLM 调用失败: " + code + " " + err);
            }

            return request.isStream()
                ? readStream(conn, listener, start)
                : readJson(conn, start);
        } catch (Exception e) {
            log.error("[llm] chat error", e);
            return LlmChatResponse.failed(e.getMessage());
        }
    }

    // ---------------- 请求构造 ----------------

    private HttpURLConnection openConnection(AgentModelConfigService.LlmConfig cfg, JSONObject body)
        throws Exception {
        String url = cfg.getApiHost();
        if (!url.endsWith("/")) {
            url += "/";
        }
        url += "chat/completions";

        HttpURLConnection conn = (HttpURLConnection) new URL(url).openConnection();
        conn.setRequestMethod("POST");
        conn.setRequestProperty("Authorization", "Bearer " + cfg.getApiKey());
        conn.setRequestProperty("Content-Type", "application/json");
        conn.setDoOutput(true);
        conn.setConnectTimeout(30_000);
        conn.setReadTimeout(0);
        try (OutputStream os = conn.getOutputStream()) {
            os.write(body.toString().getBytes(StandardCharsets.UTF_8));
        }
        return conn;
    }

    private JSONArray buildMessages(LlmChatRequest request) {
        JSONArray array = new JSONArray();
        if (request.getMessages() == null) {
            return array;
        }
        for (LlmMessage message : request.getMessages()) {
            JSONObject json = new JSONObject().set("role", message.getRole());

            if ("assistant".equals(message.getRole()) && message.hasToolCalls()) {
                if (message.getContent() != null && !message.getContent().isEmpty()) {
                    json.set("content", message.getContent());
                }
                JSONArray calls = new JSONArray();
                for (LlmToolCall call : message.getToolCalls()) {
                    calls.add(new JSONObject()
                        .set("id", call.getId())
                        .set("type", "function")
                        .set("function", new JSONObject()
                            .set("name", call.getName())
                            .set("arguments", call.getArguments())));
                }
                json.set("tool_calls", calls);
            } else if ("tool".equals(message.getRole())) {
                json.set("tool_call_id", message.getToolCallId());
                json.set("content", message.getContent());
            } else if ("user".equals(message.getRole())
                && message.getImages() != null && !message.getImages().isEmpty()) {
                json.set("content", buildMultimodalContent(message));
            } else {
                json.set("content", message.getContent() == null ? "" : message.getContent());
            }
            array.add(json);
        }
        return array;
    }

    private JSONArray buildMultimodalContent(LlmMessage message) {
        JSONArray parts = new JSONArray();
        if (message.getContent() != null && !message.getContent().isEmpty()) {
            parts.add(new JSONObject().set("type", "text").set("text", message.getContent()));
        }
        for (String image : message.getImages()) {
            parts.add(new JSONObject()
                .set("type", "image_url")
                .set("image_url", new JSONObject().set("url", image)));
        }
        return parts;
    }

    // ---------------- 响应解析 ----------------

    private LlmChatResponse readStream(HttpURLConnection conn, TokenListener listener, long start)
        throws Exception {
        StringBuilder content = new StringBuilder();
        Map<Integer, JSONObject> toolCalls = new TreeMap<>();

        try (BufferedReader reader = new BufferedReader(
                new InputStreamReader(conn.getInputStream(), StandardCharsets.UTF_8))) {
            String line;
            while ((line = reader.readLine()) != null) {
                if (!line.startsWith("data:")) {
                    continue;
                }
                String data = line.substring(5).trim();
                if ("[DONE]".equals(data) || data.isEmpty()) {
                    continue;
                }
                JSONObject chunk = JSONUtil.parseObj(data);
                JSONArray choices = chunk.getJSONArray("choices");
                if (choices == null || choices.isEmpty()) {
                    continue;
                }
                JSONObject delta = choices.getJSONObject(0).getJSONObject("delta");
                if (delta == null) {
                    continue;
                }

                if (delta.containsKey("content")) {
                    String token = delta.getStr("content");
                    if (token != null && !token.isEmpty()) {
                        content.append(token);
                        if (listener != null) {
                            listener.onToken(token);
                        }
                    }
                }
                accumulateToolCalls(delta, toolCalls);
            }
        }

        return buildResponse(content.toString(), toolCalls, start);
    }

    private LlmChatResponse readJson(HttpURLConnection conn, long start) throws Exception {
        String raw = readAll(conn.getInputStream());
        JSONObject json = JSONUtil.parseObj(raw);
        JSONArray choices = json.getJSONArray("choices");
        if (choices == null || choices.isEmpty()) {
            return LlmChatResponse.of("");
        }
        JSONObject message = choices.getJSONObject(0).getJSONObject("message");
        String content = message.getStr("content", "");

        Map<Integer, JSONObject> indexed = new TreeMap<>();
        JSONArray calls = message.getJSONArray("tool_calls");
        if (calls != null) {
            for (int i = 0; i < calls.size(); i++) {
                indexed.put(i, calls.getJSONObject(i));
            }
        }
        Map<Integer, JSONObject> toolCalls = new TreeMap<>(indexed);
        return buildResponse(content, toolCalls, start);
    }

    private void accumulateToolCalls(JSONObject delta, Map<Integer, JSONObject> accumulated) {
        if (!delta.containsKey("tool_calls")) {
            return;
        }
        JSONArray parts = delta.getJSONArray("tool_calls");
        if (parts == null) {
            return;
        }
        for (int i = 0; i < parts.size(); i++) {
            JSONObject part = parts.getJSONObject(i);
            int index = part.getInt("index", 0);
            JSONObject entry = accumulated.computeIfAbsent(index, k -> new JSONObject());
            if (part.containsKey("id")) {
                entry.set("id", part.getStr("id"));
            }
            if (part.containsKey("type")) {
                entry.set("type", part.getStr("type"));
            }
            JSONObject function = part.getJSONObject("function");
            if (function != null) {
                JSONObject entryFunction = entry.getJSONObject("function");
                if (entryFunction == null) {
                    entryFunction = new JSONObject();
                    entry.set("function", entryFunction);
                }
                if (function.containsKey("name")) {
                    entryFunction.set("name", function.getStr("name"));
                }
                if (function.containsKey("arguments")) {
                    String existing = entryFunction.getStr("arguments", "");
                    entryFunction.set("arguments", existing + function.getStr("arguments"));
                }
            }
        }
    }

    private LlmChatResponse buildResponse(String content,
                                          Map<Integer, JSONObject> rawToolCalls,
                                          long start) {
        List<LlmToolCall> calls = new ArrayList<>();
        for (JSONObject raw : rawToolCalls.values()) {
            JSONObject function = raw.getJSONObject("function");
            if (function == null) {
                continue;
            }
            String name = function.getStr("name");
            String args = repairJson(function.getStr("arguments", ""));
            calls.add(LlmToolCall.builder()
                .id(raw.getStr("id"))
                .name(name)
                .arguments(args)
                .build());
        }

        return LlmChatResponse.builder()
            .content(content)
            .toolCalls(calls)
            .durationMs(System.currentTimeMillis() - start)
            .build();
    }

    /**
     * 尽力把模型吐出的残缺 JSON 修好。
     * 小模型流式输出 args 时经常丢结尾括号或引号，这里做最小必要的补齐。
     */
    static String repairJson(String raw) {
        if (raw == null) {
            return "{}";
        }
        String trimmed = raw.trim();
        if (trimmed.isEmpty()) {
            return "{}";
        }
        if (JSONUtil.isJsonObj(trimmed)) {
            return trimmed;
        }
        StringBuilder fixed = new StringBuilder(trimmed);
        boolean inString = false;
        boolean escaped = false;
        for (int i = 0; i < fixed.length(); i++) {
            char c = fixed.charAt(i);
            if (escaped) {
                escaped = false;
                continue;
            }
            if (c == '\\') {
                escaped = true;
            } else if (c == '"') {
                inString = !inString;
            }
        }
        if (inString) {
            fixed.append('"');
        }
        long braces = fixed.chars().filter(c -> c == '{').count()
            - fixed.chars().filter(c -> c == '}').count();
        long brackets = fixed.chars().filter(c -> c == '[').count()
            - fixed.chars().filter(c -> c == ']').count();
        for (long i = 0; i < brackets; i++) {
            fixed.append(']');
        }
        for (long i = 0; i < braces; i++) {
            fixed.append('}');
        }
        String result = fixed.toString();
        return JSONUtil.isJsonObj(result) ? result : "{}";
    }

    private String readAll(InputStream inputStream) throws Exception {
        if (inputStream == null) {
            return "";
        }
        try (BufferedReader reader = new BufferedReader(
                new InputStreamReader(inputStream, StandardCharsets.UTF_8))) {
            StringBuilder builder = new StringBuilder();
            String line;
            while ((line = reader.readLine()) != null) {
                builder.append(line).append('\n');
            }
            return builder.toString();
        }
    }
}
