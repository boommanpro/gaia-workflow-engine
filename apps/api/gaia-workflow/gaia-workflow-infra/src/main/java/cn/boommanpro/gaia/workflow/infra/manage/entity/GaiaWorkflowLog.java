package cn.boommanpro.gaia.workflow.infra.manage.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@TableName("gaia_workflow_log")
public class GaiaWorkflowLog {

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
     * 执行ID，全局唯一
     */
    @TableField("execution_id")
    private String executionId;

    /**
     * 开始执行时间
     */
    @TableField("start_time")
    private LocalDateTime startTime;

    /**
     * 执行结束时间
     */
    @TableField("end_time")
    private LocalDateTime endTime;

    /**
     * 执行状态（success-成功，failed-失败，running-执行中）
     */
    @TableField("status")
    private String status;

    /**
     * 输入参数（JSON格式）
     */
    @TableField("input_params")
    private String inputParams;

    /**
     * 输出参数（JSON格式）
     */
    @TableField("output_params")
    private String outputParams;

    /**
     * 错误信息
     */
    @TableField("error_message")
    private String errorMessage;

    /**
     * 执行时长（毫秒）
     */
    @TableField("execution_duration")
    private Long executionDuration;

    /**
     * 调用渠道：execute-原生执行端点 / api-对外发布 API 调用
     */
    @TableField("invoke_channel")
    private String invokeChannel;

    /**
     * 调用路径（对外 API 时为 /api/v1/wf/{code}）
     */
    @TableField("api_path")
    private String apiPath;

    /**
     * API Key 前缀（脱敏，用于看板区分调用方）
     */
    @TableField("api_key_prefix")
    private String apiKeyPrefix;

    /**
     * 创建时间
     */
    @TableField(value = "created_at", fill = FieldFill.INSERT)
    private LocalDateTime createdAt;
}
