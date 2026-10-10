package cn.boommanpro.gaia.workflow.app.agent.llm;

/**
 * LLM 调用重试策略（对齐 dsh llm-retry 的可重试码语义）。
 *
 * <p>可重试分类：RATE_LIMIT / SERVER / TIMEOUT / TRANSPORT / EMPTY_RESPONSE；
 * 不可重试：4xx 参数类错误、CONTEXT_WINDOW（重试同样会爆）。</p>
 *
 * <p>退避：500ms 起指数增长，上限 10s，附加 ±10% 抖动避免并发惊群。
 * 「durable before wait」由调用方保证：先把 llm_retry 事件写入日志再睡眠。</p>
 */
public final class LlmRetryPolicy {

    public static final int MAX_ATTEMPTS = 5;
    private static final long BASE_DELAY_MS = 500;
    private static final long MAX_DELAY_MS = 10_000;

    private LlmRetryPolicy() {
    }

    /** 该响应是否值得重试（错误分类驱动 + 空响应视作可重试） */
    public static boolean shouldRetry(LlmChatResponse response, int attempt) {
        if (attempt >= MAX_ATTEMPTS) {
            return false;
        }
        if (response == null || !response.isError()) {
            return false;
        }
        if (response.getErrorCode() == null) {
            // 空（非工具）响应：服务端截断/模板问题的常见形态，重试经常能恢复
            return isEmptyResponse(response);
        }
        return response.isRetryable();
    }

    /** 成功响应但正文与工具调用全空 → 视为 EMPTY_RESPONSE（可重试） */
    public static boolean isEmptyResponse(LlmChatResponse response) {
        return !response.isError()
            && (response.getContent() == null || response.getContent().trim().isEmpty())
            && !response.hasToolCalls();
    }

    /** 第 attempt 次（从 1 起）失败后的退避时长 */
    public static long backoffMs(int attempt) {
        long delay = BASE_DELAY_MS << Math.min(attempt - 1, 5);
        delay = Math.min(delay, MAX_DELAY_MS);
        double jitter = 0.9 + Math.random() * 0.2;
        return Math.round(delay * jitter);
    }
}
