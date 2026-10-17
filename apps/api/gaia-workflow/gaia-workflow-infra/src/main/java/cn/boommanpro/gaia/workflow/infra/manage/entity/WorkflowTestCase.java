package cn.boommanpro.gaia.workflow.infra.manage.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;

/**
 * 工作流测试用例（节点级/工作流级）
 */
@Data
@TableName("workflow_test_case")
public class WorkflowTestCase {

    @TableId(value = "id", type = IdType.AUTO)
    private Long id;

    @TableField("workflow_code")
    private String workflowCode;

    /** 节点级用例的目标节点（null=工作流级） */
    @TableField("node_id")
    private String nodeId;

    @TableField("name")
    private String name;

    @TableField("description")
    private String description;

    /** 工作流级: start 入参对象；节点级: {"<上游id>":{"<字段>":值} */
    @TableField("inputs_json")
    private String inputsJson;

    /** [{"field","op"(exists/equals/contains),"value"}] */
    @TableField("expected_json")
    private String expectedJson;

    @TableField("created_by")
    private String createdBy;

    @TableField("enabled")
    private Integer enabled;

    @TableField("created_at")
    private String createdAt;

    @TableField("updated_at")
    private String updatedAt;

    @TableField("is_deleted")
    @TableLogic
    private Integer isDeleted;
}
