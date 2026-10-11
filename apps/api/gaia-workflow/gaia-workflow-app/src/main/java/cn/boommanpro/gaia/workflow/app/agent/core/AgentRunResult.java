package cn.boommanpro.gaia.workflow.app.agent.core;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

/**
 * 一次 Agent 运行的结果。
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AgentRunResult {

    /** 最终回复文本 */
    private String content;

    /** 实际执行的 Agent id */
    private String agentId;

    /** 会话 key */
    private String sessionKey;

    /** 实际轮次数 */
    private int turns;

    /** 是否因触达护栏（上下文硬上限等）而中止（true 说明可能没跑完） */
    private boolean abortedByTurnLimit;

    /** 是否被用户/系统主动中断（协作式取消；已交付内容以 interrupted 标记落盘） */
    private boolean interrupted;

    /** 是否出错 */
    private boolean error;

    /** 错误信息 */
    private String errorMessage;

    /** 执行引擎 id（agentscope / ark / local） */
    private String engine;

    /** run 总耗时（ms） */
    private long durationMs;

    /** 工具耗时合计（并发区间重叠合并，非各步相加） */
    private long toolTimeMs;

    @Builder.Default
    private Integer promptTokens = 0;

    @Builder.Default
    private Integer completionTokens = 0;

    /** 空响应/模型级重试次数 */
    @Builder.Default
    private int llmRetries = 0;

    /**
     * 结构化失败链（有序）：user_interrupt / repeat_guard_hard_stop[:tool] /
     * exceeded_max_iters / empty_response / empty_response_unrecovered /
     * wrap_up_advisory / engine_error。run_end 归因卡的数据源；成功 run 可为空。
     */
    @Builder.Default
    private List<String> failureChain = new ArrayList<>();

    /** 等待前端执行的工具调用（仅 FRONTEND 模式会产生） */
    @Builder.Default
    private List<PendingToolCall> pendingToolCalls = new ArrayList<>();

    /** 本次执行过的工具记录 */
    @Builder.Default
    private List<String> executedTools = new ArrayList<>();

    public static AgentRunResult success(String content, String agentId, String sessionKey, int turns) {
        return AgentRunResult.builder()
            .content(content)
            .agentId(agentId)
            .sessionKey(sessionKey)
            .turns(turns)
            .build();
    }

    public static AgentRunResult failure(String errorMessage) {
        return AgentRunResult.builder().error(true).errorMessage(errorMessage).build();
    }

    /**
     * 需要交给前端执行的工具调用。
     *
     * @param id        OpenAI tool_call id
     * @param name      工具名
     * @param arguments 原始参数 JSON 字符串
     * @param policy    权限策略
     */
    @Data
    @AllArgsConstructor
    @NoArgsConstructor
    public static class PendingToolCall {
        private String id;
        private String name;
        private String arguments;
        private String policy;
    }
}
