package cn.boommanpro.gaia.workflow.app.agent.core;

import cn.boommanpro.gaia.workflow.app.agent.llm.LlmMessage;

import java.util.List;

/**
 * 会话存取端口（Port，六边形架构里的出向端口）。
 *
 * <p>让 {@code AgentRuntime} 不直接依赖 MyBatis：
 * 无头批量任务可以换成内存实现，单元测试可以换成假实现。</p>
 */
public interface ConversationStore {

    /** 按时间正序加载历史消息 */
    List<LlmMessage> loadHistory(String sessionKey, int maxMessages);

    /** 保存一条消息 */
    void saveMessage(String sessionKey, String role, String content,
                     String toolCallsJson, String toolCallId);

    /** 生成一个会话 key */
    String newSessionKey();
}
