package cn.boommanpro.gaia.workflow.app.schedule;

import cn.boommanpro.gaia.workflow.app.service.WorkflowRunHistoryService;
import cn.boommanpro.gaia.workflow.infra.manage.entity.GaiaWorkflow;
import cn.boommanpro.gaia.workflow.infra.manage.entity.WorkflowRun;
import cn.boommanpro.gaia.workflow.infra.manage.entity.WorkflowSchedule;
import cn.boommanpro.gaia.workflow.infra.manage.service.GaiaWorkflowService;
import cn.boommanpro.gaia.workflow.infra.manage.service.WorkflowScheduleService;
import cn.hutool.json.JSONUtil;
import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.UpdateWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.*;
import java.util.stream.Collectors;

/**
 * 定时任务管理 API（/api/schedule/*）。
 *
 * 业务校验失败统一返回 200 + {success:false, message}（与 /api/execute 同风格；
 * Boot 2.7 默认吞掉 ResponseStatusException 的 message，前端 extractError 拿不到提示）。
 * 到点触发与立即运行都走 {@link WorkflowSchedulerService}，运行记录落
 * workflow_run（trigger_channel=schedule + schedule_id）。
 */
@RestController
@RequestMapping("api/schedule")
public class WorkflowScheduleController {

    private final WorkflowScheduleService scheduleService;
    private final GaiaWorkflowService workflowService;
    private final WorkflowSchedulerService schedulerService;
    private final WorkflowRunHistoryService runHistoryService;

    public WorkflowScheduleController(WorkflowScheduleService scheduleService,
                                      GaiaWorkflowService workflowService,
                                      WorkflowSchedulerService schedulerService,
                                      WorkflowRunHistoryService runHistoryService) {
        this.scheduleService = scheduleService;
        this.workflowService = workflowService;
        this.schedulerService = schedulerService;
        this.runHistoryService = runHistoryService;
    }

    /** 任务列表（附目标工作流名与生效版本标记） */
    @GetMapping("list")
    public List<Map<String, Object>> list() {
        List<WorkflowSchedule> schedules = scheduleService.list(
            new QueryWrapper<WorkflowSchedule>().orderByDesc("id"));
        Set<String> codes = schedules.stream()
            .map(WorkflowSchedule::getWorkflowCode).collect(Collectors.toSet());
        Map<String, GaiaWorkflow> workflowByCode = codes.isEmpty() ? Collections.emptyMap()
            : workflowService.list(new QueryWrapper<GaiaWorkflow>().in("workflow_code", codes))
                .stream().collect(Collectors.toMap(GaiaWorkflow::getWorkflowCode, w -> w, (a, b) -> a));
        return schedules.stream().map(s -> {
            GaiaWorkflow wf = workflowByCode.get(s.getWorkflowCode());
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("id", s.getId());
            row.put("scheduleName", s.getScheduleName());
            row.put("workflowCode", s.getWorkflowCode());
            row.put("workflowName", wf != null ? wf.getWorkflowName() : null);
            row.put("workflowHasCurrent", wf != null && wf.getCurrentVersionId() != null);
            row.put("cronExpression", s.getCronExpression());
            row.put("timezone", s.getTimezone());
            row.put("status", s.getStatus());
            row.put("misfirePolicy", s.getMisfirePolicy());
            row.put("inputs", parseInputs(s.getInputsJson()));
            row.put("nextFireTime", s.getNextFireTime());
            row.put("lastFireTime", s.getLastFireTime());
            row.put("lastRunTaskId", s.getLastRunTaskId());
            row.put("lastRunStatus", s.getLastRunStatus());
            row.put("lastError", s.getLastError());
            row.put("missCount", s.getMissCount());
            row.put("createdAt", s.getCreatedAt());
            row.put("updatedAt", s.getUpdatedAt());
            return row;
        }).collect(Collectors.toList());
    }

    /** 新建定时任务 */
    @PostMapping("create")
    public Map<String, Object> create(@RequestBody Map<String, Object> body) {
        String name = str(body.get("scheduleName"));
        String workflowCode = str(body.get("workflowCode"));
        if (name == null || name.isBlank()) {
            return fail("请填写任务名称");
        }
        GaiaWorkflow workflow = workflowCode == null ? null
            : workflowService.getOne(new QueryWrapper<GaiaWorkflow>().eq("workflow_code", workflowCode));
        if (workflow == null) {
            return fail("目标工作流不存在: " + workflowCode);
        }
        if (workflow.getCurrentVersionId() == null) {
            return fail("目标工作流没有已生效版本，请先在编辑器发布: " + workflowCode);
        }
        String cron = ScheduleCronSupport.validate(str(body.get("cronExpression")));
        if (cron == null) {
            return fail("cron 表达式非法: " + body.get("cronExpression"));
        }
        ZoneId zone = zoneOrNull(str(body.get("timezone")));
        if (zone == null) {
            return fail("时区非法: " + body.get("timezone"));
        }

        WorkflowSchedule s = new WorkflowSchedule();
        s.setScheduleName(name.trim());
        s.setWorkflowCode(workflowCode);
        s.setCronExpression(cron);
        s.setTimezone(zone.getId());
        s.setInputsJson(toJson(body.get("inputs")));
        s.setMisfirePolicy(WorkflowSchedule.MISFIRE_RUN_ONCE.equals(str(body.get("misfirePolicy")))
            ? WorkflowSchedule.MISFIRE_RUN_ONCE : WorkflowSchedule.MISFIRE_SKIP);
        s.setStatus(WorkflowSchedule.STATUS_ENABLED);
        s.setMissCount(0);
        s.setNextFireTime(computeNext(cron, zone));
        s.setLastRunStatus("none");
        scheduleService.save(s);
        Map<String, Object> response = ok("已创建定时任务「" + name.trim() + "」");
        response.put("id", s.getId());
        return response;
    }

    /** 编辑定时任务（全量覆盖式：字段以本次请求为准） */
    @PutMapping("update/{id}")
    public Map<String, Object> update(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        WorkflowSchedule s = scheduleService.getById(id);
        if (s == null) {
            return fail("定时任务不存在: " + id);
        }
        String name = str(body.get("scheduleName"));
        if (name == null || name.isBlank()) {
            return fail("请填写任务名称");
        }
        String workflowCode = str(body.get("workflowCode"));
        GaiaWorkflow workflow = workflowCode == null ? null
            : workflowService.getOne(new QueryWrapper<GaiaWorkflow>().eq("workflow_code", workflowCode));
        if (workflow == null || workflow.getCurrentVersionId() == null) {
            return fail("目标工作流不存在或没有已生效版本: " + workflowCode);
        }
        String cron = ScheduleCronSupport.validate(str(body.get("cronExpression")));
        if (cron == null) {
            return fail("cron 表达式非法: " + body.get("cronExpression"));
        }
        ZoneId zone = zoneOrNull(str(body.get("timezone")));
        if (zone == null) {
            return fail("时区非法: " + body.get("timezone"));
        }
        String misfire = WorkflowSchedule.MISFIRE_RUN_ONCE.equals(str(body.get("misfirePolicy")))
            ? WorkflowSchedule.MISFIRE_RUN_ONCE : WorkflowSchedule.MISFIRE_SKIP;

        boolean cronChanged = !cron.equals(s.getCronExpression()) || !zone.getId().equals(s.getTimezone());
        scheduleService.update(new UpdateWrapper<WorkflowSchedule>()
            .eq("id", id)
            .set("schedule_name", name.trim())
            .set("workflow_code", workflowCode)
            .set("cron_expression", cron)
            .set("timezone", zone.getId())
            .set("inputs_json", toJson(body.get("inputs")))
            .set("misfire_policy", misfire)
            .set("updated_at", LocalDateTime.now()));
        // 触发规则变了（或启用中还没有下次时间）：重算，避免沿用旧规则的到点
        if (cronChanged && WorkflowSchedule.STATUS_ENABLED.equals(s.getStatus())) {
            scheduleService.update(new UpdateWrapper<WorkflowSchedule>()
                .eq("id", id)
                .set("next_fire_time", computeNext(cron, zone)));
        }
        return ok("已保存定时任务「" + name.trim() + "」");
    }

    /** 删除定时任务（运行历史保留，仅删配置） */
    @DeleteMapping("delete/{id}")
    public Map<String, Object> delete(@PathVariable Long id) {
        if (scheduleService.removeById(id)) {
            return ok("已删除定时任务");
        }
        return fail("定时任务不存在: " + id);
    }

    /** 启用/停用：停用时清空 next_fire_time；重新启用时从现在起重算 */
    @PutMapping("toggle/{id}")
    public Map<String, Object> toggle(@PathVariable Long id) {
        WorkflowSchedule s = scheduleService.getById(id);
        if (s == null) {
            return fail("定时任务不存在: " + id);
        }
        boolean enable = !WorkflowSchedule.STATUS_ENABLED.equals(s.getStatus());
        ZoneId zone = zoneOrNull(s.getTimezone());
        LocalDateTime next = enable ? computeNext(s.getCronExpression(), zone) : null;
        scheduleService.update(new UpdateWrapper<WorkflowSchedule>()
            .eq("id", id)
            .set("status", enable ? WorkflowSchedule.STATUS_ENABLED : WorkflowSchedule.STATUS_DISABLED)
            .set("next_fire_time", next)
            .set("updated_at", LocalDateTime.now()));
        return ok(enable ? "已启用，到点将自动运行" : "已停用，到点不再触发");
    }

    /** 立即运行一次（不影响定时节奏；上一次未结束会拒绝） */
    @PostMapping("run/{id}")
    public Map<String, Object> run(@PathVariable Long id) {
        WorkflowSchedule s = scheduleService.getById(id);
        if (s == null) {
            return fail("定时任务不存在: " + id);
        }
        Map<String, Object> result = schedulerService.runNow(s);
        boolean started = Boolean.TRUE.equals(result.get("started"));
        Map<String, Object> response = new HashMap<>(result);
        response.put("success", started);
        return response;
    }

    /** cron 预览：校验表达式并返回未来 N 次触发时间（新建/编辑表单实时预览） */
    @GetMapping("preview")
    public Map<String, Object> preview(@RequestParam String cron,
                                       @RequestParam(required = false, defaultValue = "Asia/Shanghai") String timezone,
                                       @RequestParam(required = false, defaultValue = "5") int count) {
        Map<String, Object> result = new HashMap<>();
        String normalized = ScheduleCronSupport.validate(cron);
        if (normalized == null) {
            result.put("valid", false);
            result.put("error", "cron 表达式非法（支持 5 位 unix 或 6 位 Spring cron）");
            return result;
        }
        ZoneId zone = zoneOrNull(timezone);
        if (zone == null) {
            result.put("valid", false);
            result.put("error", "时区非法: " + timezone);
            return result;
        }
        result.put("valid", true);
        result.put("normalized", normalized);
        result.put("timezone", zone.getId());
        result.put("times", ScheduleCronSupport.nextFires(normalized, zone, ZonedDateTime.now(zone),
                Math.max(1, Math.min(10, count))).stream()
            .map(ZonedDateTime::toLocalDateTime)
            .map(LocalDateTime::toString)
            .collect(Collectors.toList()));
        return result;
    }

    /** 单个任务的运行历史（workflow_run 按 schedule_id 过滤） */
    @GetMapping("{id}/runs")
    public Page<WorkflowRun> runs(@PathVariable Long id,
                                  @RequestParam(defaultValue = "1") int page,
                                  @RequestParam(defaultValue = "20") int size) {
        return runHistoryService.listRuns(null, "schedule", id, page, size);
    }

    // ==================== 内部 ====================

    private LocalDateTime computeNext(String cron, ZoneId zone) {
        ZonedDateTime next = ScheduleCronSupport.nextFire(cron, zone, ZonedDateTime.now(zone));
        return next != null ? next.toLocalDateTime() : null;
    }

    private static ZoneId zoneOrNull(String timezone) {
        if (timezone == null || timezone.isBlank()) {
            return ZoneId.of("Asia/Shanghai");
        }
        try {
            return ZoneId.of(timezone.trim());
        } catch (Exception e) {
            return null;
        }
    }

    private static String str(Object value) {
        return value != null ? String.valueOf(value) : null;
    }

    private static String toJson(Object value) {
        return value == null ? null : JSONUtil.toJsonStr(value);
    }

    private static Map<String, Object> parseInputs(String inputsJson) {
        if (inputsJson == null || inputsJson.isBlank() || !JSONUtil.isJson(inputsJson)) {
            return Collections.emptyMap();
        }
        try {
            return JSONUtil.parseObj(inputsJson);
        } catch (Exception e) {
            return Collections.emptyMap();
        }
    }

    private static LinkedHashMap<String, Object> ok(String message) {
        LinkedHashMap<String, Object> map = new LinkedHashMap<>();
        map.put("success", true);
        map.put("message", message);
        return map;
    }

    private static LinkedHashMap<String, Object> fail(String message) {
        LinkedHashMap<String, Object> map = new LinkedHashMap<>();
        map.put("success", false);
        map.put("message", message);
        return map;
    }
}
