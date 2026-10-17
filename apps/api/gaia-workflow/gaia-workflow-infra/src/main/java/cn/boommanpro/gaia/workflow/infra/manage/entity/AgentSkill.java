package cn.boommanpro.gaia.workflow.infra.manage.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;

/**
 * Agent 技能元数据（原 node_knowledge 重构）。正文按文件存 {@link AgentSkillFile}，SKILL.md 为入口。
 */
@Data
@TableName("agent_skill")
public class AgentSkill {

    @TableId(value = "id", type = IdType.AUTO)
    private Long id;

    @TableField("name")
    private String name;

    @TableField("description")
    private String description;

    /** node | pattern | general | domain */
    @TableField("kind")
    private String kind;

    @TableField("enabled")
    private Integer enabled;

    /** seed | user */
    @TableField("source")
    private String source;

    @TableField("updated_at")
    private String updatedAt;

    @TableField("is_deleted")
    @TableLogic
    private Integer isDeleted;
}
