package cn.boommanpro.gaia.workflow.infra.manage.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;

/**
 * Agent 人设/规范/压缩提示词配置（IDENTITY/SOUL/AGENTS/COMPACTION）
 */
@Data
@TableName("agent_prompt_config")
public class AgentPromptConfig {

    @TableId(value = "id", type = IdType.AUTO)
    private Long id;

    @TableField("config_key")
    private String configKey;

    @TableField("content")
    private String content;

    @TableField("version")
    private Integer version;

    @TableField("scope")
    private String scope;

    @TableField("updated_by")
    private String updatedBy;

    @TableField("updated_at")
    private String updatedAt;

    @TableField("is_deleted")
    @TableLogic
    private Integer isDeleted;
}
