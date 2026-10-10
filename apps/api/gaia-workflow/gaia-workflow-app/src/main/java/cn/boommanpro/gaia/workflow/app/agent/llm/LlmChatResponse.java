package cn.boommanpro.gaia.workflow.app.agent.llm;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

/**
 * LLM 调用响应。
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LlmChatResponse {

    /** 回复正文 */
    private String content;

    /** 模型请求的工具调用 */
    @Builder.Default
    private List<LlmToolCall> toolCalls = new ArrayList<>();

    /** 思考过程累计（模型 reasoning 输出；仅展示用，不进下一轮上下文） */
    private String thinking;

    /** 实际使用的模型名（调试日志用） */
    private String model;

    /** 耗时毫秒 */
    private long durationMs;

    /** 是否调用失败 */
    private boolean error;

    private String errorMessage;

    /**
     * 失败分类码（供重试策略判定）：RATE_LIMIT / SERVER / TIMEOUT / TRANSPORT /
     * EMPTY_RESPONSE / CONTEXT_WINDOW；null = 不可重试或非失败。
     */
    private String errorCode;

    /** 本次请求的 prompt token 用量（流式末 chunk 的 usage，可能为 null） */
    private Integer promptTokens;

    /** 本次请求的 completion token 用量（可能为 null） */
    private Integer completionTokens;

    public boolean hasToolCalls() {
        return toolCalls != null && !toolCalls.isEmpty();
    }

    public boolean isRetryable() {
        return errorCode != null && !errorCode.isEmpty()
            && !"CONTEXT_WINDOW".equals(errorCode);
    }

    public static LlmChatResponse of(String content) {
        return LlmChatResponse.builder().content(content).build();
    }

    public static LlmChatResponse failed(String message) {
        return failed(message, null);
    }

    public static LlmChatResponse failed(String message, String errorCode) {
        return LlmChatResponse.builder()
            .error(true).errorMessage(message).errorCode(errorCode).content("").build();
    }
}
