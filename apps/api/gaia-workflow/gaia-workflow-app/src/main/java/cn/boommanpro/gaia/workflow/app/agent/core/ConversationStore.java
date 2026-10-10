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

    /**
     * 保存一条消息（可携带多模态图片）。
     * 默认实现忽略图片，仅用于兼容只关心文本的调用方；
     * 支持图片的存储实现应覆写此方法。
     */
    default void saveMessage(String sessionKey, String role, String content,
                             String toolCallsJson, String toolCallId,
                             java.util.List<String> images) {
        saveMessage(sessionKey, role, content, toolCallsJson, toolCallId);
    }

    /**
     * 保存一条消息（可携带思考过程）。
     * 思考过程仅用于审查与回放展示，不参与下一轮模型上下文。
     */
    default void saveMessage(String sessionKey, String role, String content,
                             String toolCallsJson, String toolCallId,
                             String thinking) {
        saveMessage(sessionKey, role, content, toolCallsJson, toolCallId);
    }

    /** 生成一个会话 key */
    String newSessionKey();

    // ===== 上下文压缩（surface replace）的持久化侧 =====

    /**
     * 把一批已加载的消息标记为「已被摘要覆盖」。
     * 这些消息不再进入后续 run 的模型上下文（loadHistory 跳过），
     * 但前端展示与审查日志不受影响。
     */
    default void markCompacted(String sessionKey, java.util.List<Long> messageIds) {
        // 内存实现/测试假实现无需支持
    }

    /**
     * 写入一条前情摘要消息（user 角色，带标记前缀），返回消息 id。
     * 返回 null 表示存储不支持（压缩降级为仅本次 run 内存生效）。
     */
    default Long saveSummary(String sessionKey, String content) {
        saveMessage(sessionKey, "user", content, null, null);
        return null;
    }
}
