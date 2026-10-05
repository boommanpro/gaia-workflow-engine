package cn.boommanpro.gaia.workflow.infra.manage.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import java.time.LocalDateTime;

/**
 * 工作空间文件夹（Work 模式：按文件夹分组的对话）
 */
@Data
@TableName("agent_work_folder")
public class AgentWorkFolder {

    @TableId(value = "id", type = IdType.AUTO)
    private Long id;

    /**
     * 文件夹名称
     */
    @TableField("name")
    private String name;

    /**
     * 排序权重（越小越靠前）
     */
    @TableField("sort_order")
    private Integer sortOrder;

    @TableField(value = "created_at", fill = FieldFill.INSERT)
    private LocalDateTime createdAt;

    @TableField(value = "updated_at", fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updatedAt;

    /**
     * 是否删除（0-未删除，1-已删除）
     */
    @TableField("is_deleted")
    @TableLogic
    private Integer isDeleted;
}
