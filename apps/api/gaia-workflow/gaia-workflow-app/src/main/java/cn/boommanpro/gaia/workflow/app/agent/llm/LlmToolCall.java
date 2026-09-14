package cn.boommanpro.gaia.workflow.app.agent.llm;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 模型请求的工具调用（厂商无关表示）。
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LlmToolCall {

    /** OpenAI 协议里的 tool_call id */
    private String id;

    /** 函数名，如 applyWorkflow */
    private String name;

    /** 原始参数 JSON 字符串 */
    private String arguments;
}
