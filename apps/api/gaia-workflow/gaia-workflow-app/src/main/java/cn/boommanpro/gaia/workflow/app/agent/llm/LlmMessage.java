package cn.boommanpro.gaia.workflow.app.agent.llm;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 统一的对话消息模型（与具体厂商解耦）。
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LlmMessage {

    /** system / user / assistant / tool */
    private String role;

    /** 文本内容 */
    private String content;

    /** role=tool 时对应的 tool_call id */
    private String toolCallId;

    /** role=assistant 且含工具调用时的调用列表 */
    private java.util.List<LlmToolCall> toolCalls;

    /** 多模态图片（base64 data url），仅 user 角色使用 */
    private java.util.List<String> images;

    /** 对应持久层消息 id（会话压缩需要回写 compacted 标记；内存构造的消息为 null） */
    private Long refId;

    public static LlmMessage system(String content) {
        return LlmMessage.builder().role("system").content(content).build();
    }

    public static LlmMessage user(String content) {
        return LlmMessage.builder().role("user").content(content).build();
    }

    public static LlmMessage assistant(String content) {
        return LlmMessage.builder().role("assistant").content(content).build();
    }

    public static LlmMessage tool(String toolCallId, String content) {
        return LlmMessage.builder().role("tool").toolCallId(toolCallId).content(content).build();
    }

    public boolean hasToolCalls() {
        return toolCalls != null && !toolCalls.isEmpty();
    }
}
