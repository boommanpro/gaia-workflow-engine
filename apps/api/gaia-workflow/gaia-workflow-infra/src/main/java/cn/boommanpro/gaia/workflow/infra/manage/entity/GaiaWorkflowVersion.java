package cn.boommanpro.gaia.workflow.infra.manage.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@TableName("gaia_workflow_version")
public class GaiaWorkflowVersion {

    /**
     * 主键ID
     */
    @TableId(value = "id", type = IdType.AUTO)
    private Long id;

    /**
     * 工作流编码
     */
    @TableField("workflow_code")
    private String workflowCode;

    /**
     * 版本号
     */
    @TableField("version_number")
    private String versionNumber;

    /**
     * 版本描述
     */
    @TableField("version_desc")
    private String versionDesc;

    /**
     * 工作流数据（JSON格式）
     */
    @TableField("workflow_data")
    private String workflowData;

    /**
     * 创建人
     */
    @TableField("created_by")
    private String createdBy;

    /**
     * 创建时间
     */
    @TableField(value = "created_at", fill = FieldFill.INSERT)
    private LocalDateTime createdAt;

    /**
     * 是否为当前版本（0-否，1-是）
     */
    @TableField("is_current")
    private Integer isCurrent;
}
