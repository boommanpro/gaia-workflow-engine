package cn.boommanpro.gaia.workflow.app.agent.ass;

import cn.boommanpro.gaia.workflow.app.agent.core.AgentRunContext;

import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;

/**
 * as-service 工具上下文桥 —— MCP 端点在执行工具时按 Gaia 会话键找到当前运行上下文。
 *
 * <p>引擎每轮运行开始时注册 live 上下文（含前端事件 sink / 中断标记），结束注销；
 * MCP 调用若落在运行窗口内则复用 live 上下文（画布变更事件能实时推给前端），
 * 否则由端点构造离线上下文（headless、事件丢弃）。</p>
 */
public final class AssToolContextBridge {

    private static final ConcurrentMap<String, AgentRunContext> ACTIVE = new ConcurrentHashMap<>();

    private AssToolContextBridge() {
    }

    public static void register(String sessionKey, AgentRunContext context) {
        if (sessionKey != null && context != null) {
            ACTIVE.put(sessionKey, context);
        }
    }

    public static void unregister(String sessionKey, AgentRunContext context) {
        if (sessionKey != null) {
            ACTIVE.remove(sessionKey, context);
        }
    }

    public static AgentRunContext activeContext(String sessionKey) {
        return sessionKey == null ? null : ACTIVE.get(sessionKey);
    }
}
