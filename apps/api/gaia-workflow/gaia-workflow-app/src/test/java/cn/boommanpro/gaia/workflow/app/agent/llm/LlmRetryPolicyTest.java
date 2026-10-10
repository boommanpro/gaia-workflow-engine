package cn.boommanpro.gaia.workflow.app.agent.llm;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.within;

/**
 * LLM 重试策略单测：可重试分类、退避边界、空响应识别。
 */
class LlmRetryPolicyTest {

    @Test
    void retryableClassifications() {
        assertThat(LlmRetryPolicy.shouldRetry(LlmChatResponse.failed("429", "RATE_LIMIT"), 1)).isTrue();
        assertThat(LlmRetryPolicy.shouldRetry(LlmChatResponse.failed("500", "SERVER"), 1)).isTrue();
        assertThat(LlmRetryPolicy.shouldRetry(LlmChatResponse.failed("timeout", "TIMEOUT"), 1)).isTrue();
        assertThat(LlmRetryPolicy.shouldRetry(LlmChatResponse.failed("conn", "TRANSPORT"), 1)).isTrue();
        // 4xx 参数类错误与上下文超限：不可重试
        assertThat(LlmRetryPolicy.shouldRetry(LlmChatResponse.failed("401", null), 1)).isFalse();
        assertThat(LlmRetryPolicy.shouldRetry(LlmChatResponse.failed("too long", "CONTEXT_WINDOW"), 1)).isFalse();
        // 成功响应不重试
        assertThat(LlmRetryPolicy.shouldRetry(LlmChatResponse.of("ok"), 1)).isFalse();
        // 超过最大次数不重试
        assertThat(LlmRetryPolicy.shouldRetry(LlmChatResponse.failed("500", "SERVER"),
            LlmRetryPolicy.MAX_ATTEMPTS)).isFalse();
    }

    @Test
    void emptyResponseDetection() {
        assertThat(LlmRetryPolicy.isEmptyResponse(LlmChatResponse.of(""))).isTrue();
        assertThat(LlmRetryPolicy.isEmptyResponse(LlmChatResponse.of("  "))).isTrue();
        assertThat(LlmRetryPolicy.isEmptyResponse(LlmChatResponse.of("有内容"))).isFalse();
        LlmChatResponse toolOnly = LlmChatResponse.builder().content("").toolCalls(
            java.util.List.of(LlmToolCall.builder().id("1").name("t").arguments("{}").build())).build();
        assertThat(LlmRetryPolicy.isEmptyResponse(toolOnly)).isFalse();
        assertThat(LlmRetryPolicy.isEmptyResponse(LlmChatResponse.failed("x"))).isFalse();
    }

    @Test
    void backoffExponentialWithJitterAndCap() {
        long first = LlmRetryPolicy.backoffMs(1);
        long second = LlmRetryPolicy.backoffMs(2);
        long third = LlmRetryPolicy.backoffMs(3);
        long huge = LlmRetryPolicy.backoffMs(20);

        assertThat(first).isCloseTo(500L, within(80L));
        assertThat(second).isCloseTo(1000L, within(150L));
        assertThat(third).isCloseTo(2000L, within(300L));
        // 上限 10s（+抖动）
        assertThat(huge).isLessThanOrEqualTo(11_000);
    }

    @Test
    void httpStatusClassification() {
        assertThat(OpenAiCompatibleLlmProvider.classifyHttpStatus(429)).isEqualTo("RATE_LIMIT");
        assertThat(OpenAiCompatibleLlmProvider.classifyHttpStatus(408)).isEqualTo("TIMEOUT");
        assertThat(OpenAiCompatibleLlmProvider.classifyHttpStatus(500)).isEqualTo("SERVER");
        assertThat(OpenAiCompatibleLlmProvider.classifyHttpStatus(503)).isEqualTo("SERVER");
        assertThat(OpenAiCompatibleLlmProvider.classifyHttpStatus(400)).isNull();
        assertThat(OpenAiCompatibleLlmProvider.classifyHttpStatus(401)).isNull();
    }
}
