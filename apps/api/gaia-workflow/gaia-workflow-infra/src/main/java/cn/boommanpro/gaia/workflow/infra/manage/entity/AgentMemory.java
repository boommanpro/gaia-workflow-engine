package cn.boommanpro.gaia.workflow.infra.manage.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;

/**
 * 记忆条目（owb 双层记忆的条目区，2026-10-11）：agent 通过 remember 工具自记，
 * 按用户隔离去重，超量丢最旧。手写区不在本表（复用 agent_config 的 memory.manual）。
 */
@Data
@TableName("agent_memory")
public class AgentMemory {

    @TableId(value = "id", type = IdType.AUTO)
    private Long id;

    /** 作用域：global（暂单用户；预留 per-user） */
    @TableField("scope")
    private String scope;

    @TableField("content")
    private String content;

    /** 来源：agent（工具自记）/ manual（界面手写，与手写区同步） */
    @TableField("source")
    private String source;

    @TableField("created_at")
    private String createdAt;

    @TableField("updated_at")
    private String updatedAt;
}
