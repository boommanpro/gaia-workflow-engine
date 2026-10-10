package cn.boommanpro.gaia.workflow.infra.manage.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;

/**
 * Agent 会话持久事件日志（追加只写）。
 *
 * <p>对齐 deepseek-harness 的 durable session event log 思想：
 * 「模型可见即已记录」—— run 期间的 turn/llm_end/tool_call/tool_result/knowledge_retrieved/
 * confirm 等事件按序落表，供回放调试、审查与指标统计。超长 payload 截断保留。</p>
 */
@Data
@TableName("agent_session_event")
public class AgentSessionEvent {

    @TableId(value = "id", type = IdType.AUTO)
    private Long id;

    @TableField("session_key")
    private String sessionKey;

    @TableField("run_id")
    private String runId;

    /** 会话内自增序号（按落库顺序） */
    @TableField("seq")
    private Integer seq;

    /** 事件类型：turn / llm_end / tool_call / tool_result / knowledge_retrieved / confirm_request / confirm_resolved / document / plan / error */
    @TableField("event_type")
    private String eventType;

    /** 事件数据 JSON（超长截断） */
    @TableField("payload")
    private String payload;

    @TableField("created_at")
    private String createdAt;
}
