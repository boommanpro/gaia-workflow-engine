package cn.boommanpro.gaia.workflow.infra.manage.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;

import java.time.LocalDateTime;

/** 一次试运行的运行实例（workflow_run 表，第一档 B：运行即证据） */
@Data
@TableName("workflow_run")
public class WorkflowRun {

    @TableId(value = "id", type = IdType.AUTO)
    private Long id;

    /** 任务 ID（api/task/run 返回的 taskID，全局唯一） */
    @TableField("task_id")
    private String taskId;

    /** 工作流编码（编辑器试运行时来自路由参数；未关联时为空） */
    @TableField("workflow_code")
    private String workflowCode;

    /** 终态：success / failed / canceled */
    @TableField("status")
    private String status;

    @TableField("error_message")
    private String errorMessage;

    @TableField("inputs_json")
    private String inputsJson;

    @TableField("outputs_json")
    private String outputsJson;

    /** 参与运行的节点数 */
    @TableField("node_count")
    private Integer nodeCount;

    @TableField("duration_ms")
    private Long durationMs;

    /** 触发通道：editor=编辑器试运行 */
    @TableField("trigger_channel")
    private String triggerChannel;

    @TableField("started_at")
    private LocalDateTime startedAt;

    @TableField("finished_at")
    private LocalDateTime finishedAt;

    @TableField("created_at")
    private LocalDateTime createdAt;
}
