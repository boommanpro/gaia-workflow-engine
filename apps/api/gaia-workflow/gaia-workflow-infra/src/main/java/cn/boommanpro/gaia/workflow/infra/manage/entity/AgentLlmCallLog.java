package cn.boommanpro.gaia.workflow.infra.manage.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;

/**
 * LLM 调用账本 —— 「generation 级观测」的数据底座（对标 OpenWorkBuddy trace 的 generation 层）。
 *
 * <p>每次模型调用一行：请求摘要（消息数+头尾截断的 prompt 摘要）、响应摘要、
 * token 用量（含缓存命中）、耗时、结局。失败/空响应类问题的事后根因探索靠它 ——
 * 没有这张表，模型侧的怪行为（空转、复读、漏斗）永远无法复现。</p>
 */
@Data
@TableName("agent_llm_call_log")
public class AgentLlmCallLog {

    @TableId(value = "id", type = IdType.AUTO)
    private Long id;

    @TableField("session_key")
    private String sessionKey;

    @TableField("run_id")
    private String runId;

    /** run 内调用序号（从 1 起） */
    @TableField("seq")
    private Integer seq;

    @TableField("model")
    private String model;

    /** 请求消息条数 */
    @TableField("messages_count")
    private Integer messagesCount;

    /** 请求工具 schema 数 */
    @TableField("tools_count")
    private Integer toolsCount;

    /** 请求摘要（消息头尾截断拼接，超长挖洞） */
    @TableField("prompt_digest")
    private String promptDigest;

    /** 响应摘要（正文+工具调用，头尾截断） */
    @TableField("output_digest")
    private String outputDigest;

    @TableField("prompt_tokens")
    private Integer promptTokens;

    @TableField("completion_tokens")
    private Integer completionTokens;

    @TableField("cached_tokens")
    private Integer cachedTokens;

    @TableField("duration_ms")
    private Long durationMs;

    /** 结局：ok / empty / error */
    @TableField("status")
    private String status;

    /** 错误类型/摘要（status=error 时） */
    @TableField("error_message")
    private String errorMessage;

    @TableField("created_at")
    private String createdAt;
}
