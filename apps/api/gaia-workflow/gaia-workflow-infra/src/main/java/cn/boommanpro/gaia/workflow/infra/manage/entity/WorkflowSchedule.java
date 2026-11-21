package cn.boommanpro.gaia.workflow.infra.manage.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import java.time.LocalDateTime;

/**
 * 定时任务（workflow_schedule 表）。
 *
 * 一条记录 = 「到点以固定入参运行某工作流当前生效版本」的自动化：
 * 到期判定只看 next_fire_time（该时区的墙钟时间，由 cron 预计算），
 * 触发时 CAS 抢占推进，错过处理按 misfire_policy。
 */
@Data
@TableName("workflow_schedule")
public class WorkflowSchedule {

    public static final String STATUS_ENABLED = "enabled";
    public static final String STATUS_DISABLED = "disabled";

    /** 错过策略：跳过并等待下次（miss_count 递增） */
    public static final String MISFIRE_SKIP = "skip";
    /** 错过策略：恢复后立即补跑一次 */
    public static final String MISFIRE_RUN_ONCE = "run_once";

    @TableId(value = "id", type = IdType.AUTO)
    private Long id;

    /** 任务名称（对外展示） */
    @TableField("schedule_name")
    private String scheduleName;

    /** 目标工作流编码（运行时始终取其当前生效版本） */
    @TableField("workflow_code")
    private String workflowCode;

    /** 6 位 Spring cron（秒 分 时 日 月 周）；入库前由 ScheduleCronSupport 规范化 */
    @TableField("cron_expression")
    private String cronExpression;

    /** 时区（IANA ID，默认 Asia/Shanghai）——cron 与 next_fire_time 都按它解释 */
    @TableField("timezone")
    private String timezone;

    /** 定时运行入参（JSON 对象；未填字段运行时用 start 节点 outputs.properties 的 default 兜底） */
    @TableField("inputs_json")
    private String inputsJson;

    /** enabled / disabled */
    @TableField("status")
    private String status;

    /** skip / run_once */
    @TableField("misfire_policy")
    private String misfirePolicy;

    /** 下次触发墙钟时间（timezone 时区）；disabled 时为空 */
    @TableField("next_fire_time")
    private LocalDateTime nextFireTime;

    /** 最近一次触发时间（尝试触发即更新，无论成败） */
    @TableField("last_fire_time")
    private LocalDateTime lastFireTime;

    /** 最近一次触发的 taskId（编辑器任务报告可用它查询实时进度） */
    @TableField("last_run_task_id")
    private String lastRunTaskId;

    /** running / success / failed / canceled / missed / invalid（触发前置校验失败） */
    @TableField("last_run_status")
    private String lastRunStatus;

    @TableField("last_error")
    private String lastError;

    /** 应用停机累计错过的触发次数（misfire=skip 时递增） */
    @TableField("miss_count")
    private Integer missCount;

    @TableField(value = "created_at", fill = FieldFill.INSERT)
    private LocalDateTime createdAt;

    @TableField(value = "updated_at", fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updatedAt;
}
