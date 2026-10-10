package cn.boommanpro.gaia.workflow.app.agent.core;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.util.List;
import java.util.Map;

/**
 * 一次 Agent 运行的入参。
 */
@Data
@AllArgsConstructor
public class AgentRequest {

    /** 会话 key，无头模式下可为 null（系统会生成临时 key） */
    private String sessionKey;

    /** 用户输入 */
    private String message;

    /** 语言，如 zh-CN / en-US */
    private String locale;

    /** 前端页面上下文 JSON 字符串（画布摘要、路由等），无头模式下为 null */
    private String pageContext;

    /** 指定 Agent；为空则由路由规则挑选 */
    private String agentId;

    /** 覆盖执行模式；为空则沿用 Agent 定义 */
    private ToolExecutionMode executionMode;

    /** @deprecated 主循环已移除轮次硬上限（自然停止 + 护栏组合），字段仅为兼容保留 */
    @Deprecated
    private int maxTurns;

    /** 附加变量，供上下文提供者与工具使用 */
    private Map<String, Object> variables;

    /** 本次 run 的运行标识（事件日志/指标关联用；可为空） */
    private String runId;

    public static AgentRequest of(String message) {
        return new AgentRequest(null, message, "zh-CN", null, null, null, 0, null, null);
    }

    public static AgentRequest of(String sessionKey, String message, String locale, String pageContext) {
        return new AgentRequest(sessionKey, message, locale, pageContext, null, null, 0, null, null);
    }

    public AgentRequest withRunId(String runId) {
        this.runId = runId;
        return this;
    }
}
