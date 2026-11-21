package cn.boommanpro.gaia.workflow.app.schedule;

import cn.boommanpro.gaia.workflow.app.domain.testrun.input.TaskRunInput;
import cn.boommanpro.gaia.workflow.app.domain.testrun.model.TaskInfo;
import cn.boommanpro.gaia.workflow.app.domain.testrun.output.TaskRunOutput;
import cn.boommanpro.gaia.workflow.app.service.TaskRepository;
import cn.boommanpro.gaia.workflow.app.service.WorkflowTaskService;
import cn.boommanpro.gaia.workflow.infra.manage.entity.GaiaWorkflow;
import cn.boommanpro.gaia.workflow.infra.manage.entity.GaiaWorkflowVersion;
import cn.boommanpro.gaia.workflow.infra.manage.entity.WorkflowSchedule;
import cn.boommanpro.gaia.workflow.infra.manage.service.GaiaWorkflowService;
import cn.boommanpro.gaia.workflow.infra.manage.service.GaiaWorkflowVersionService;
import cn.boommanpro.gaia.workflow.infra.manage.service.WorkflowRunService;
import cn.boommanpro.gaia.workflow.infra.manage.service.WorkflowScheduleService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.time.LocalDateTime;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * 调度器核心语义：到期决策（正常/运行中/停机错过×两种策略）、
 * 入参默认值兜底、触发链路（复用编辑器试运行 + channel/scheduleId 透传）。
 */
class WorkflowSchedulerServiceTest {

    private WorkflowScheduleService scheduleService;
    private GaiaWorkflowService workflowService;
    private GaiaWorkflowVersionService workflowVersionService;
    private WorkflowTaskService workflowTaskService;
    private TaskRepository taskRepository;
    private WorkflowRunService runService;
    private WorkflowSchedulerService scheduler;

    @BeforeEach
    void setUp() {
        scheduleService = mock(WorkflowScheduleService.class);
        workflowService = mock(GaiaWorkflowService.class);
        workflowVersionService = mock(GaiaWorkflowVersionService.class);
        workflowTaskService = mock(WorkflowTaskService.class);
        taskRepository = mock(TaskRepository.class);
        runService = mock(WorkflowRunService.class);
        scheduler = new WorkflowSchedulerService(scheduleService, workflowService,
            workflowVersionService, workflowTaskService, taskRepository, runService);
    }

    // ==================== 到期决策 ====================

    @Test
    @DisplayName("决策：正常到期且上次已结束 → FIRE")
    void decideFire() {
        LocalDateTime now = LocalDateTime.of(2026, 11, 21, 9, 0, 5);
        assertEquals(WorkflowSchedulerService.Decision.FIRE,
            WorkflowSchedulerService.decide(now.minusSeconds(5), now, false, "skip"));
    }

    @Test
    @DisplayName("决策：秒级扫描抖动（1 分钟内）不算错过")
    void decideSmallLagStillFires() {
        LocalDateTime now = LocalDateTime.of(2026, 11, 21, 9, 4, 0);
        assertEquals(WorkflowSchedulerService.Decision.FIRE,
            WorkflowSchedulerService.decide(now.minusMinutes(4), now, false, "skip"));
    }

    @Test
    @DisplayName("决策：上次运行未结束 → SKIP_RUNNING（不打断节奏）")
    void decideSkipRunning() {
        LocalDateTime now = LocalDateTime.of(2026, 11, 21, 9, 0, 5);
        assertEquals(WorkflowSchedulerService.Decision.SKIP_RUNNING,
            WorkflowSchedulerService.decide(now.minusSeconds(5), now, true, "skip"));
    }

    @Test
    @DisplayName("决策：停机错过（>5 分钟）+ skip 策略 → MISFIRE_SKIP")
    void decideMisfireSkip() {
        LocalDateTime now = LocalDateTime.of(2026, 11, 21, 9, 30, 0);
        assertEquals(WorkflowSchedulerService.Decision.MISFIRE_SKIP,
            WorkflowSchedulerService.decide(now.minusMinutes(30), now, false, "skip"));
    }

    @Test
    @DisplayName("决策：停机错过 + run_once 策略 → MISFIRE_RUN_ONCE")
    void decideMisfireRunOnce() {
        LocalDateTime now = LocalDateTime.of(2026, 11, 21, 9, 30, 0);
        assertEquals(WorkflowSchedulerService.Decision.MISFIRE_RUN_ONCE,
            WorkflowSchedulerService.decide(now.minusMinutes(30), now, false, "run_once"));
    }

    // ==================== 入参兜底 ====================

    @Test
    @DisplayName("入参兜底：未填字段用 start 节点 outputs.properties 的 default 补齐，已填不覆盖")
    void mergeDefaultInputs() {
        String schema = "{\"nodes\":[{\"id\":\"n1\",\"type\":\"start\",\"data\":{\"outputs\":"
            + "{\"type\":\"object\",\"properties\":{"
            + "\"topic\":{\"type\":\"string\",\"default\":\"科技\"},"
            + "\"count\":{\"type\":\"number\",\"default\":10},"
            + "\"custom\":{\"type\":\"string\"}}}}},"
            + "{\"id\":\"n2\",\"type\":\"end\"}]}";
        Map<String, Object> merged = WorkflowSchedulerService.mergeDefaultInputs(
            "{\"topic\":\"AI\",\"extra\":\"keep\"}", schema);
        assertEquals("AI", merged.get("topic"), "显式配置优先");
        assertEquals(10, merged.get("count"), "缺省字段用 default");
        assertEquals("keep", merged.get("extra"), "非 schema 字段原样保留");
        assertFalse(merged.containsKey("custom"), "无 default 的字段不硬造");
    }

    @Test
    @DisplayName("入参兜底：schema 无 start 节点时只传显式配置")
    void mergeDefaultInputsNoStart() {
        Map<String, Object> merged = WorkflowSchedulerService.mergeDefaultInputs(
            "{\"a\":1}", "{\"nodes\":[{\"id\":\"n1\",\"type\":\"end\"}]}");
        assertEquals(1, merged.get("a"));
        assertEquals(1, merged.size());
    }

    // ==================== 触发链路 ====================

    @Test
    @DisplayName("触发：工作流无生效版本 → started=false 且失败状态落表")
    void fireWithoutVersion() {
        when(workflowService.getOne(any())).thenReturn(null);
        WorkflowSchedule s = schedule(1L, "wf-x");

        Map<String, Object> result = scheduler.fire(s);

        assertFalse(Boolean.TRUE.equals(result.get("started")));
        assertTrue(String.valueOf(result.get("message")).contains("没有已生效版本"));
        verify(scheduleService).update(any());
    }

    @Test
    @DisplayName("触发：复用试运行链路，channel=schedule + scheduleId 透传，默认入参补齐")
    void fireHappyPath() {
        GaiaWorkflow wf = new GaiaWorkflow();
        wf.setWorkflowCode("wf-ok");
        wf.setCurrentVersionId(9L);
        when(workflowService.getOne(any())).thenReturn(wf);
        GaiaWorkflowVersion version = new GaiaWorkflowVersion();
        version.setWorkflowData("{\"nodes\":[{\"id\":\"n1\",\"type\":\"start\",\"data\":{\"outputs\":"
            + "{\"properties\":{\"topic\":{\"type\":\"string\",\"default\":\"科技\"}}}}}]}");
        when(workflowVersionService.getOne(any())).thenReturn(version);
        TaskRunOutput out = new TaskRunOutput("task-abc");
        when(workflowTaskService.runWorkflow(any())).thenReturn(out);

        WorkflowSchedule s = schedule(7L, "wf-ok");
        s.setInputsJson("{\"topic\":\"AI\"}");
        Map<String, Object> result = scheduler.fire(s);

        assertEquals(Boolean.TRUE, result.get("started"));
        assertEquals("task-abc", result.get("taskId"));

        ArgumentCaptor<TaskRunInput> captor = ArgumentCaptor.forClass(TaskRunInput.class);
        verify(workflowTaskService).runWorkflow(captor.capture());
        TaskRunInput sent = captor.getValue();
        assertEquals("schedule", sent.getTriggerChannel());
        assertEquals(7L, sent.getScheduleId());
        assertEquals("wf-ok", sent.getWorkflowCode());
        assertEquals("AI", sent.getInputs().get("topic"));
        assertEquals(Boolean.TRUE, Boolean.valueOf(sent.getSchema().contains("start")));
    }

    @Test
    @DisplayName("触发：运行前校验失败（无 taskId）→ started=false 带原因")
    void fireValidationFailed() {
        GaiaWorkflow wf = new GaiaWorkflow();
        wf.setWorkflowCode("wf-bad");
        wf.setCurrentVersionId(3L);
        when(workflowService.getOne(any())).thenReturn(wf);
        GaiaWorkflowVersion version = new GaiaWorkflowVersion();
        version.setWorkflowData("{}");
        when(workflowVersionService.getOne(any())).thenReturn(version);
        when(workflowTaskService.runWorkflow(any()))
            .thenReturn(TaskRunOutput.fail(java.util.List.of("缺少 start 节点"), null));

        Map<String, Object> result = scheduler.fire(schedule(2L, "wf-bad"));

        assertFalse(Boolean.TRUE.equals(result.get("started")));
        assertTrue(String.valueOf(result.get("message")).contains("校验未通过"));
    }

    @Test
    @DisplayName("processDue：未到期（next_fire_time 在未来）直接返回，不触发")
    void processDueNotDue() {
        WorkflowSchedule s = schedule(3L, "wf-ok");
        s.setNextFireTime(LocalDateTime.now().plusMinutes(10));
        scheduler.processDue(s);
        verify(scheduleService, never()).casAdvanceNextFire(anyLong(), any(), any());
        verify(workflowTaskService, never()).runWorkflow(any());
    }

    @Test
    @DisplayName("runNow：上次运行仍在内存且未终止 → 拒绝")
    void runNowBlockedWhileRunning() {
        WorkflowSchedule s = schedule(4L, "wf-ok");
        s.setLastRunStatus("running");
        s.setLastRunTaskId("task-running");
        when(taskRepository.getTask("task-running")).thenReturn(new TaskInfo("{}", null));

        Map<String, Object> result = scheduler.runNow(s);

        assertFalse(Boolean.TRUE.equals(result.get("started")));
        assertTrue(String.valueOf(result.get("message")).contains("尚未结束"));
        verify(workflowTaskService, never()).runWorkflow(any());
    }

    // ==================== 工具 ====================

    private WorkflowSchedule schedule(Long id, String workflowCode) {
        WorkflowSchedule s = new WorkflowSchedule();
        s.setId(id);
        s.setScheduleName("测试任务");
        s.setWorkflowCode(workflowCode);
        s.setCronExpression("0 * * * * *");
        s.setTimezone("Asia/Shanghai");
        s.setStatus(WorkflowSchedule.STATUS_ENABLED);
        s.setMisfirePolicy(WorkflowSchedule.MISFIRE_SKIP);
        return s;
    }
}
