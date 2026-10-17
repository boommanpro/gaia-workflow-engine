package cn.boommanpro.gaia.workflow.infra.manage.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;

/**
 * 测试用例运行记录
 */
@Data
@TableName("workflow_test_run")
public class WorkflowTestRun {

    @TableId(value = "id", type = IdType.AUTO)
    private Long id;

    @TableField("case_id")
    private Long caseId;

    /** passed | failed | error | stale */
    @TableField("status")
    private String status;

    @TableField("actual_json")
    private String actualJson;

    @TableField("assert_results_json")
    private String assertResultsJson;

    @TableField("error")
    private String error;

    @TableField("duration_ms")
    private Long durationMs;

    /** agent | manual */
    @TableField("source")
    private String source;

    @TableField("executed_at")
    private String executedAt;

    @TableField("is_deleted")
    @TableLogic
    private Integer isDeleted;
}
