package cn.boommanpro.gaia.workflow.app.service;

import cn.boommanpro.gaia.workflow.app.service.AgentModelConfigService.LlmConfig;
import cn.hutool.json.JSONArray;
import cn.hutool.json.JSONObject;
import cn.hutool.json.JSONUtil;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;

/**
 * 一次性 LLM 补全（非流式）—— 供「AI 生成」管理端功能与会话压缩摘要等
 * 辅助场景使用。对话主循环不走这里（agentscope / 方舟引擎各自主理）。
 */
@Slf4j
@Service
public class LlmCompletionService {

    private final AgentModelConfigService modelConfigService;

    public LlmCompletionService(AgentModelConfigService modelConfigService) {
        this.modelConfigService = modelConfigService;
    }

    /**
     * 单轮补全。
     *
     * @param systemPrompt 系统段（任务说明，如「生成知识库文档」「压缩对话摘要」）
     * @param userText     用户段（待处理文本）
     * @param temperature  采样温度
     * @param maxTokens    输出上限
     * @return 模型回复文本
     */
    public String complete(String systemPrompt, String userText, double temperature, int maxTokens) throws Exception {
        LlmConfig cfg = modelConfigService.getLlmConfig();
        JSONArray messages = new JSONArray();
        messages.add(new JSONObject().set("role", "system").set("content", systemPrompt));
        messages.add(new JSONObject().set("role", "user").set("content", userText));
        JSONObject body = new JSONObject()
            .set("model", cfg.getModel())
            .set("temperature", temperature)
            .set("messages", messages)
            .set("max_tokens", maxTokens);

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
        conn.setConnectTimeout(30000);
        conn.setReadTimeout(120000);
        conn.getOutputStream().write(body.toString().getBytes(StandardCharsets.UTF_8));

        if (conn.getResponseCode() != 200) {
            throw new RuntimeException("LLM completion failed: HTTP " + conn.getResponseCode()
                + " " + readAll(conn.getErrorStream()));
        }
        JSONObject resp = JSONUtil.parseObj(readAll(conn.getInputStream()));
        return resp.getJSONArray("choices").getJSONObject(0).getJSONObject("message").getStr("content");
    }

    private static String readAll(java.io.InputStream is) {
        if (is == null) {
            return "";
        }
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(is, StandardCharsets.UTF_8))) {
            StringBuilder sb = new StringBuilder();
            String line;
            while ((line = reader.readLine()) != null) {
                sb.append(line);
            }
            return sb.toString();
        } catch (Exception e) {
            return "";
        }
    }
}
