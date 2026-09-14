package cn.boommanpro.gaia.workflow.app.agent.llm;

import cn.hutool.json.JSONArray;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

/**
 * LLM 调用请求。
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LlmChatRequest {

    /** 完整消息列表（含 system） */
    @Builder.Default
    private List<LlmMessage> messages = new ArrayList<>();

    /** 可用工具的 OpenAI schema */
    private JSONArray tools;

    /** 温度，null 表示用供应商默认 */
    private Double temperature;

    /** 最大输出 token，0 表示不限 */
    private int maxTokens;

    /** 是否流式 */
    @Builder.Default
    private boolean stream = true;
}
