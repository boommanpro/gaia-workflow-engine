package cn.boommanpro.gaia.workflow.infra.manage.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;

/** 技能版本历史快照 */
@Data
@TableName("agent_skill_history")
public class AgentSkillHistory {

    @TableId(value = "id", type = IdType.AUTO)
    private Long id;

    @TableField("skill_name")
    private String skillName;

    @TableField("version")
    private Integer version;

    @TableField("files_json")
    private String filesJson;

    @TableField("changed_by")
    private String changedBy;

    @TableField("created_at")
    private String createdAt;
}
