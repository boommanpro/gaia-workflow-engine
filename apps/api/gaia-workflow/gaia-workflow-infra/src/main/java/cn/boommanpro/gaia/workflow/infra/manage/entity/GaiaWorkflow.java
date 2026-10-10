package cn.boommanpro.gaia.workflow.infra.manage.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@TableName("gaia_workflow")
public class GaiaWorkflow {

    /**
     * 主键ID
     */
    @TableId(value = "id", type = IdType.AUTO)
    private Long id;

    /**
     * 工作流编码，全局唯一
     */
    @TableField("workflow_code")
    private String workflowCode;

    /**
     * 工作流名称
     */
    @TableField("workflow_name")
    private String workflowName;

    /**
     * 工作流描述
     */
    @TableField("workflow_desc")
    private String workflowDesc;

    /**
     * 当前版本ID
     */
    @TableField("current_version_id")
    private Long currentVersionId;

    /**
     * 乐观锁修订号：任何提交（AI 落版 / 编辑器手动保存）+1。
     * 工具链的 read→edit→save 均以它做 CAS 基准，防止基于陈旧状态的覆盖。
     */
    @TableField("revision")
    private Long revision;

    /**
     * 来源模板编码
     */
    @TableField("template_code")
    private String templateCode;

    /**
     * 创建时间
     */
    @TableField(value = "created_at", fill = FieldFill.INSERT)
    private LocalDateTime createdAt;

    /**
     * 更新时间
     */
    @TableField(value = "updated_at", fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updatedAt;

    /**
     * 是否删除（0-未删除，1-已删除）
     */
    @TableField("is_deleted")
    @TableLogic
    private Integer isDeleted;
}
