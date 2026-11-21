package cn.boommanpro.gaia.workflow.app.schedule;

import cn.boommanpro.gaia.workflow.app.domain.testrun.input.TaskRunInput;
import cn.boommanpro.gaia.workflow.app.domain.testrun.model.TaskInfo;
import cn.boommanpro.gaia.workflow.app.domain.testrun.output.TaskRunOutput;
import cn.boommanpro.gaia.workflow.app.service.TaskRepository;
import cn.boommanpro.gaia.workflow.app.service.WorkflowTaskService;
import cn.boommanpro.gaia.workflow.infra.manage.entity.GaiaWorkflow;
import cn.boommanpro.gaia.workflow.infra.manage.entity.GaiaWorkflowVersion;
import cn.boommanpro.gaia.workflow.infra.manage.entity.WorkflowRun;
import cn.boommanpro.gaia.workflow.infra.manage.entity.WorkflowSchedule;
import cn.boommanpro.gaia.workflow.infra.manage.service.GaiaWorkflowService;
import cn.boommanpro.gaia.workflow.infra.manage.service.GaiaWorkflowVersionService;
import cn.boommanpro.gaia.workflow.infra.manage.service.WorkflowRunService;
import cn.boommanpro.gaia.workflow.infra.manage.service.WorkflowScheduleService;
import cn.hutool.json.JSONArray;
import cn.hutool.json.JSONObject;
import cn.hutool.json.JSONUtil;
import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.UpdateWrapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 定时任务调度器：单线程扫描循环（fixedDelay 天然不重叠）+ DB 为唯一事实源。
 *
 * 每轮扫描（默认 15s）：
 *   1. 对账 running 态任务（运行结束把终态回写 workflow_schedule）；
 *   2. 取全部 enabled 且 next_fire_time 非空的任务，Java 侧做到期判定
 *      （表规模是个位数~几十，避免依赖驱动对 LocalDateTime 的 WHERE 序列化行为）；
 *   3. 到期任务先 CAS 抢占（UPDATE ... WHERE next_fire_time = 旧值）再触发，
 *      防重复消费；错过（落后超过 5 分钟视为停机错过）按 misfire_policy 处理。
 *
 * 触发执行完全复用编辑器试运行链路（WorkflowTaskService.runWorkflow）：
 * 异步线程池、统一校验门禁、运行历史落库（trigger_channel=schedule）全部免费获得。
 * 桌面应用未运行期间不会触发——恢复后由错过策略兜底，这是单机形态的如实行为。
 */
@Service
public class WorkflowSchedulerService {

    private static final Logger logger = LoggerFactory.getLogger(WorkflowSchedulerService.class);

    /** 到期点落后超过该阈值视为「应用停机错过」（正常扫描抖动在秒级） */
    static final java.time.Duration MISFIRE_THRESHOLD = java.time.Duration.ofMinutes(5);

    /** 触发通道标记：运行历史里区分 editor / schedule */
    static final String CHANNEL_SCHEDULE = "schedule";

    private final WorkflowScheduleService scheduleService;
    private final GaiaWorkflowService workflowService;
    private final GaiaWorkflowVersionService workflowVersionService;
    private final WorkflowTaskService workflowTaskService;
    private final TaskRepository taskRepository;
    private final WorkflowRunService runService;

    public WorkflowSchedulerService(WorkflowScheduleService scheduleService,
                                    GaiaWorkflowService workflowService,
                                    GaiaWorkflowVersionService workflowVersionService,
                                    WorkflowTaskService workflowTaskService,
                                    TaskRepository taskRepository,
                                    WorkflowRunService runService) {
        this.scheduleService = scheduleService;
        this.workflowService = workflowService;
        this.workflowVersionService = workflowVersionService;
        this.workflowTaskService = workflowTaskService;
        this.taskRepository = taskRepository;
        this.runService = runService;
    }

    /** 扫描循环：initialDelay 给启动期（schema 初始化/迁移）留出时间 */
    @Scheduled(fixedDelay = 15_000, initialDelay = 15_000)
    public void scan() {
        try {
            reconcileRunning();
        } catch (Exception e) {
            logger.warn("[scheduler] 对账 running 态任务失败: {}", e.getMessage());
        }
        List<WorkflowSchedule> due;
        try {
            due = listEnabled();
        } catch (Exception e) {
            logger.warn("[scheduler] 读取定时任务失败: {}", e.getMessage());
            return;
        }
        for (WorkflowSchedule s : due) {
            try {
                processDue(s);
            } catch (Exception e) {
                // 单个任务的异常不拖垮整轮扫描
                logger.error("[scheduler] 处理定时任务失败 id={} name={}: {}", s.getId(), s.getScheduleName(), e.getMessage(), e);
            }
        }
    }

    /** 到期决策（纯逻辑，供单测钉住语义） */
    enum Decision {
        /** 正常到期，触发 */
        FIRE,
        /** 到期但上一次运行未结束，跳过本次（不打断节奏） */
        SKIP_RUNNING,
        /** 停机错过，按策略跳过 */
        MISFIRE_SKIP,
        /** 停机错过，按策略补跑一次 */
        MISFIRE_RUN_ONCE
    }

    /**
     * 判定一个任务的到期处置（纯逻辑，供单测钉住语义）。
     *
     * @param nextFireTime 该任务预计算的下次触发墙钟时间（timezone 时区）
     * @param nowWall      同一时区的当前墙钟时间
     * @param stillRunning 上一次触发是否仍在运行（由调用方结合内存仓库判定）
     * @param misfirePolicy 该任务的错过策略（skip / run_once）
     */
    static Decision decide(LocalDateTime nextFireTime, LocalDateTime nowWall, boolean stillRunning, String misfirePolicy) {
        if (nextFireTime.plus(MISFIRE_THRESHOLD).isBefore(nowWall)) {
            // 落后超过阈值：应用停机期间错过的到点，按任务级策略处置
            return WorkflowSchedule.MISFIRE_RUN_ONCE.equals(misfirePolicy)
                ? Decision.MISFIRE_RUN_ONCE : Decision.MISFIRE_SKIP;
        }
        return stillRunning ? Decision.SKIP_RUNNING : Decision.FIRE;
    }

    /** 处理一个任务：到期判定 → CAS 抢占 → 触发/跳过。 */
    void processDue(WorkflowSchedule s) {
        ZoneId zone = zoneOf(s);
        LocalDateTime nowWall = LocalDateTime.now(zone);
        LocalDateTime fireAt = s.getNextFireTime();
        if (fireAt == null || fireAt.isAfter(nowWall)) {
            return; // 未到期
        }

        Decision decision = decide(fireAt, nowWall, isStillRunning(s), s.getMisfirePolicy());

        // CAS 推进：从「现在」重算下次触发（不从旧到点累加，避免长期落后追帧）
        ZonedDateTime next = ScheduleCronSupport.nextFire(s.getCronExpression(), zone, ZonedDateTime.now(zone));
        if (next == null) {
            logger.warn("[scheduler] cron 无解或非法，停用任务 id={} cron={}", s.getId(), s.getCronExpression());
            updateStatus(s.getId(), WorkflowSchedule.STATUS_DISABLED, "cron 表达式无法计算下次触发，已自动停用");
            return;
        }
        if (!scheduleService.casAdvanceNextFire(s.getId(), fireAt, next.toLocalDateTime())) {
            return; // 已被并发扫描消费
        }

        switch (decision) {
            case FIRE:
            case MISFIRE_RUN_ONCE:
                fire(s);
                break;
            case SKIP_RUNNING:
                logger.info("[scheduler] 上次运行未结束，跳过本次触发 id={} name={}", s.getId(), s.getScheduleName());
                noteSkip(s.getId(), "上一次运行尚未结束，已跳过 1 次到点触发");
                break;
            case MISFIRE_SKIP:
                logger.info("[scheduler] 停机错过触发，按策略跳过 id={} name={} fireAt={}", s.getId(), s.getScheduleName(), fireAt);
                updateRunState(s.getId(), LocalDateTime.now(zone), null, "missed",
                    "应用停机错过触发（" + fireAt + "），已按「跳过」策略处理", true);
                break;
            default:
                break;
        }
    }

    /**
     * 触发一次执行（不推进调度节奏）。定时到点与「立即运行」共用。
     *
     * @return 触发结果（taskId 非空表示已启动异步任务）
     */
    public Map<String, Object> fire(WorkflowSchedule s) {
        ZoneId zone = zoneOf(s);
        Map<String, Object> result = new HashMap<>();

        // 与 /api/execute 同款口径：workflow → currentVersionId + is_current=1 的生效版本
        GaiaWorkflow workflow = workflowService.getOne(
            new QueryWrapper<GaiaWorkflow>().eq("workflow_code", s.getWorkflowCode()));
        GaiaWorkflowVersion version = null;
        if (workflow != null && workflow.getCurrentVersionId() != null) {
            version = workflowVersionService.getOne(new QueryWrapper<GaiaWorkflowVersion>()
                .eq("workflow_code", s.getWorkflowCode())
                .eq("id", workflow.getCurrentVersionId())
                .eq("is_current", 1));
        }
        if (version == null) {
            String message = "目标工作流不存在或没有已生效版本，无法执行: " + s.getWorkflowCode();
            updateRunState(s.getId(), LocalDateTime.now(zone), null, "failed", message, false);
            result.put("started", false);
            result.put("message", message);
            return result;
        }

        TaskRunInput input = new TaskRunInput();
        input.setSchema(version.getWorkflowData());
        input.setInputs(mergeDefaultInputs(s.getInputsJson(), version.getWorkflowData()));
        input.setWorkflowCode(s.getWorkflowCode());
        input.setTriggerChannel(CHANNEL_SCHEDULE);
        input.setScheduleId(s.getId());

        TaskRunOutput out = workflowTaskService.runWorkflow(input);
        LocalDateTime now = LocalDateTime.now(zone);
        if (out != null && out.getTaskID() != null && !out.getTaskID().isBlank()) {
            updateRunState(s.getId(), now, out.getTaskID(), "running", null, false);
            logger.info("[scheduler] 已触发定时任务 id={} name={} taskId={}", s.getId(), s.getScheduleName(), out.getTaskID());
            result.put("started", true);
            result.put("taskId", out.getTaskID());
            result.put("message", "已触发运行");
        } else {
            String message = out != null && out.getErrors() != null && !out.getErrors().isEmpty()
                ? "工作流校验未通过: " + String.join("; ", out.getErrors())
                : "触发失败（未获得任务ID）";
            updateRunState(s.getId(), now, null, "failed", message, false);
            result.put("started", false);
            result.put("message", message);
        }
        return result;
    }

    /** 立即运行一次（手动）：上一次仍在跑时拒绝，避免堆叠 */
    public Map<String, Object> runNow(WorkflowSchedule s) {
        if (isStillRunning(s)) {
            Map<String, Object> result = new HashMap<>();
            result.put("started", false);
            result.put("message", "上一次运行尚未结束，请稍后再试");
            return result;
        }
        return fire(s);
    }

    // ==================== 内部 ====================

    private List<WorkflowSchedule> listEnabled() {
        return scheduleService.list(new QueryWrapper<WorkflowSchedule>()
            .eq("status", WorkflowSchedule.STATUS_ENABLED)
            .isNotNull("next_fire_time"));
    }

    /** 上一次触发是否仍在运行：内存仓库还有该任务且未终止。
     *  应用重启后内存清空 → 视为不再运行（避免 running 态永久卡死）。 */
    private boolean isStillRunning(WorkflowSchedule s) {
        if (!"running".equals(s.getLastRunStatus()) || s.getLastRunTaskId() == null) {
            return false;
        }
        TaskInfo info = taskRepository.getTask(s.getLastRunTaskId());
        return info != null && !info.getWorkflowStatus().isTerminated();
    }

    /** 对账 running 态：运行历史已落终态则回写；内存任务已终止但历史缺失也按内存终态回写 */
    private void reconcileRunning() {
        List<WorkflowSchedule> running = scheduleService.list(new QueryWrapper<WorkflowSchedule>()
            .eq("last_run_status", "running")
            .isNotNull("last_run_task_id"));
        for (WorkflowSchedule s : running) {
            try {
                WorkflowRun run = runService.getOne(
                    new QueryWrapper<WorkflowRun>().eq("task_id", s.getLastRunTaskId()).last("LIMIT 1"));
                if (run != null) {
                    updateRunState(s.getId(), null, null, normalizeStatus(run.getStatus()),
                        run.getErrorMessage(), false);
                    continue;
                }
                TaskInfo info = taskRepository.getTask(s.getLastRunTaskId());
                if (info == null) {
                    updateRunState(s.getId(), null, null, "failed", "运行结果丢失（应用可能在运行中重启）", false);
                } else if (info.getWorkflowStatus().isTerminated()) {
                    updateRunState(s.getId(), null, null, normalizeStatus(info.getWorkflowStatus().getStatus()),
                        null, false);
                }
                // 仍在运行：等下一轮对账
            } catch (Exception e) {
                logger.warn("[scheduler] 对账失败 id={}: {}", s.getId(), e.getMessage());
            }
        }
    }

    /** 入参兜底：schedule 未填的字段用 start 节点 outputs.properties 的 default 补齐
     *  （口径与「发布为 API」的 deriveRequestSchema 一致：inputs.properties 旧位优先回退 outputs）。 */
    static Map<String, Object> mergeDefaultInputs(String inputsJson, String workflowData) {
        Map<String, Object> inputs = new HashMap<>();
        if (inputsJson != null && JSONUtil.isJson(inputsJson)) {
            try {
                inputs.putAll(JSONUtil.parseObj(inputsJson));
            } catch (Exception ignore) {
                // 入参非法按空处理，由默认值兜底
            }
        }
        try {
            JSONObject root = JSONUtil.parseObj(workflowData);
            JSONArray nodes = root.getJSONArray("nodes");
            if (nodes != null) {
                for (Object o : nodes) {
                    JSONObject node = (JSONObject) o;
                    if (!"start".equals(node.getStr("type"))) {
                        continue;
                    }
                    JSONObject data = node.getJSONObject("data");
                    if (data == null) {
                        break;
                    }
                    JSONObject props = data.getJSONObject("outputs") != null
                        ? data.getJSONObject("outputs").getJSONObject("properties") : null;
                    if (props == null && data.getJSONObject("inputs") != null) {
                        props = data.getJSONObject("inputs").getJSONObject("properties");
                    }
                    if (props != null) {
                        for (String key : props.keySet()) {
                            if (!inputs.containsKey(key)) {
                                JSONObject p = props.getJSONObject(key);
                                Object defaultValue = p != null ? p.get("default") : null;
                                if (defaultValue != null) {
                                    inputs.put(key, defaultValue);
                                }
                            }
                        }
                    }
                    break;
                }
            }
        } catch (Exception ignore) {
            // schema 解析失败：只传 schedule 显式配置的入参
        }
        return inputs;
    }

    /** 精确更新触发状态（显式 set，允许清空 last_error） */
    private void updateRunState(Long id, LocalDateTime lastFireTime, String taskId, String status,
                                String error, boolean incrementMiss) {
        UpdateWrapper<WorkflowSchedule> wrapper = new UpdateWrapper<WorkflowSchedule>()
            .eq("id", id)
            .set("last_run_status", status)
            .set("last_error", error)
            .set("updated_at", LocalDateTime.now());
        if (lastFireTime != null) {
            wrapper.set("last_fire_time", lastFireTime);
        }
        if (taskId != null) {
            wrapper.set("last_run_task_id", taskId);
        }
        if (incrementMiss) {
            wrapper.setSql("miss_count = COALESCE(miss_count, 0) + 1");
        }
        scheduleService.update(wrapper);
    }

    private void updateStatus(Long id, String status, String error) {
        scheduleService.update(new UpdateWrapper<WorkflowSchedule>()
            .eq("id", id)
            .set("status", status)
            .set("last_error", error)
            .set("updated_at", LocalDateTime.now()));
    }

    /** 跳过本次触发：只记一笔说明，不改变运行状态 */
    private void noteSkip(Long id, String note) {
        scheduleService.update(new UpdateWrapper<WorkflowSchedule>()
            .eq("id", id)
            .set("last_error", note)
            .set("updated_at", LocalDateTime.now()));
    }

    private static String normalizeStatus(String status) {
        if (status == null) {
            return "failed";
        }
        switch (status) {
            case "success":
            case "succeeded":
                return "success";
            case "fail":
            case "failed":
                return "failed";
            case "canceled":
                return "canceled";
            default:
                return status;
        }
    }

    private static ZoneId zoneOf(WorkflowSchedule s) {
        try {
            return ZoneId.of(s.getTimezone() != null ? s.getTimezone() : "Asia/Shanghai");
        } catch (Exception e) {
            return ZoneId.of("Asia/Shanghai");
        }
    }
}
