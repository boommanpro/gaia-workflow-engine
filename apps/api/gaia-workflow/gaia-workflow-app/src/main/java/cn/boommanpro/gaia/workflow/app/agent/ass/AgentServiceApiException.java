package cn.boommanpro.gaia.workflow.app.agent.ass;

import lombok.Getter;

/**
 * AgentScope Service API 异常 —— 携带 HTTP 状态码，供引擎做可重试判断与错误透出。
 */
@Getter
public class AgentServiceApiException extends RuntimeException {

    private final int statusCode;

    public AgentServiceApiException(int statusCode, String message) {
        super(message);
        this.statusCode = statusCode;
    }

    /** 429/5xx/网络失败视为可重试；4xx 语义错误不重试 */
    public boolean isRetryable() {
        return statusCode == -1 || statusCode == 429 || statusCode >= 500;
    }
}
