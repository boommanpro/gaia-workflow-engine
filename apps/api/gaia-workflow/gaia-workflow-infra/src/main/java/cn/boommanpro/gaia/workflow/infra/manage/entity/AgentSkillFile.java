package cn.boommanpro.gaia.workflow.infra.manage.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;

/** 技能文件（多文件技能的组成单元） */
@Data
@TableName("agent_skill_file")
public class AgentSkillFile {

    @TableId(value = "id", type = IdType.AUTO)
    private Long id;

    @TableField("skill_name")
    private String skillName;

    @TableField("file_path")
    private String filePath;

    @TableField("content")
    private String content;

    @TableField("created_at")
    private String createdAt;

    @TableField("updated_at")
    private String updatedAt;

    @TableField("is_deleted")
    @TableLogic
    private Integer isDeleted;
}
