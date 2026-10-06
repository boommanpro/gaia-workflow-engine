package cn.boommanpro.gaia.workflow.app.agent.ark;

/**
 * 方舟 API 调用异常：携带 HTTP 状态码，调用方据此区分可重试（409 队列满 / 5xx / 限流）
 * 与不可恢复（401 鉴权 / 400 参数）错误。
 */
public class ArkApiException extends RuntimeException {

    private final int statusCode;

    public ArkApiException(int statusCode, String message) {
        super(message);
        this.statusCode = statusCode;
    }

    public int getStatusCode() {
        return statusCode;
    }

    /** 队列满（官方文档：待处理队列已满时发送事件返回 409，应退避等待而非快速重试） */
    public boolean isQueueFull() {
        return statusCode == 409;
    }

    /** 是否值得重试：限流 / 服务端瞬时错误 / 队列满 */
    public boolean isRetryable() {
        return isQueueFull() || statusCode == 429 || statusCode >= 500;
    }
}
