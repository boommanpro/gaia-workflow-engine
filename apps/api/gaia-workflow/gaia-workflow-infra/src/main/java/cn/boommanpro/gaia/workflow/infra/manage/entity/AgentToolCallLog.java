package cn.boommanpro.gaia.workflow.infra.manage.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;

/**
 * 工具调用指标表 —— 「成功率可度量」的数据底座。
 *
 * <p>每次工具调用一行：结局码（SUCCESS / INVALID_ARGS / NOT_FOUND / STALE_REVISION /
 * REJECTED_POLICY / EXEC_ERROR / TIMEOUT / CIRCUIT_BROKEN / UNAVAILABLE_SURFACE）
 * + 耗时 + 参数摘要。管理端按 工具 × 结局 聚合即得一次通过率与失败分布。</p>
 */
@Data
@TableName("agent_tool_call_log")
public class AgentToolCallLog {

    @TableId(value = "id", type = IdType.AUTO)
    private Long id;

    @TableField("session_key")
    private String sessionKey;

    @TableField("run_id")
    private String runId;

    @TableField("turn")
    private Integer turn;

    @TableField("tool_name")
    private String toolName;

    /** 结局码 */
    @TableField("outcome")
    private String outcome;

    /** 结构化错误码（ToolErrorCode，成功为空） */
    @TableField("error_code")
    private String errorCode;

    @TableField("duration_ms")
    private Long durationMs;

    /** 参数摘要（截断） */
    @TableField("args_digest")
    private String argsDigest;

    @TableField("created_at")
    private String createdAt;
}
