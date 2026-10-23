package cn.boommanpro.gaia.workflow.infra.manage.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;

import java.time.LocalDateTime;

/** 节点级执行明细（workflow_node_run 表，一次运行 N 行） */
@Data
@TableName("workflow_node_run")
public class WorkflowNodeRun {

    @TableId(value = "id", type = IdType.AUTO)
    private Long id;

    /** 所属运行的 task_id（非自增 id——运行侧只有 taskId） */
    @TableField("run_task_id")
    private String runTaskId;

    @TableField("node_id")
    private String nodeId;

    @TableField("node_type")
    private String nodeType;

    @TableField("title")
    private String title;

    /** 节点终态（succeeded/failed/canceled/pending…与 TaskReport 口径一致） */
    @TableField("status")
    private String status;

    @TableField("error_message")
    private String errorMessage;

    @TableField("inputs_json")
    private String inputsJson;

    @TableField("output_json")
    private String outputJson;

    @TableField("time_cost_ms")
    private Long timeCostMs;

    @TableField("created_at")
    private LocalDateTime createdAt;
}
