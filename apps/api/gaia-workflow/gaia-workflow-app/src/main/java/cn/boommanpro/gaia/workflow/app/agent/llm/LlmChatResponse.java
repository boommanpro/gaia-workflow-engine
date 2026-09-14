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

    /** 耗时毫秒 */
    private long durationMs;

    /** 是否调用失败 */
    private boolean error;

    private String errorMessage;

    public boolean hasToolCalls() {
        return toolCalls != null && !toolCalls.isEmpty();
    }

    public static LlmChatResponse of(String content) {
        return LlmChatResponse.builder().content(content).build();
    }

    public static LlmChatResponse failed(String message) {
        return LlmChatResponse.builder().error(true).errorMessage(message).content("").build();
    }
}
