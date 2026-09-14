package cn.boommanpro.gaia.workflow.app.agent.llm;

/**
 * LLM 供应商抽象（策略模式）。
 *
 * <p>改造前，模型调用是散落在 {@code AgentChatService} 三处的裸 {@code HttpURLConnection}
 * 代码（对话流、会话摘要、标题生成），协议细节与业务逻辑焊在一起。</p>
 *
 * <p>收敛到本接口后：</p>
 * <ul>
 *   <li>新增一家厂商 = 新增一个实现类并注册，不动运行时</li>
 *   <li>测试时可注入假实现</li>
 *   <li>流式 token 通过 {@link TokenListener} 回调输出，调用方决定是否推送（SSE / 丢弃）</li>
 * </ul>
 */
public interface LlmProvider {

    /** 供应商唯一 id，AgentDefinition.llmProviderId 引用它 */
    String getId();

    /** 展示名 */
    String getName();

    /** 该供应商当前是否可用（如缺少 apiKey 时返回 false） */
    default boolean isAvailable() {
        return true;
    }

    /**
     * 非流式对话。
     */
    LlmChatResponse chat(LlmChatRequest request);

    /**
     * 流式对话，token 通过 listener 回调。
     * 默认实现退化为非流式后在结束时回调整段文本。
     */
    default LlmChatResponse chat(LlmChatRequest request, TokenListener listener) {
        LlmChatResponse response = chat(request);
        if (listener != null && response != null && response.getContent() != null) {
            listener.onToken(response.getContent());
        }
        return response;
    }

    /**
     * 轻量文本补全，用于会话摘要、标题生成等辅助场景。
     */
    default String complete(String systemPrompt, String userPrompt) {
        java.util.List<LlmMessage> messages = new java.util.ArrayList<>();
        messages.add(LlmMessage.system(systemPrompt));
        messages.add(LlmMessage.user(userPrompt));
        LlmChatResponse response = chat(LlmChatRequest.builder()
            .messages(messages)
            .stream(false)
            .build());
        return response == null || response.getContent() == null ? "" : response.getContent().trim();
    }
}
