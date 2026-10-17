package cn.boommanpro.gaia.workflow.app.controller.api;

import cn.boommanpro.gaia.workflow.infra.manage.entity.GaiaWorkflow;
import cn.boommanpro.gaia.workflow.infra.manage.entity.GaiaWorkflowLog;
import cn.boommanpro.gaia.workflow.infra.manage.entity.GaiaWorkflowVersion;
import cn.boommanpro.gaia.workflow.app.executor.WorkflowExecutor;
import cn.boommanpro.gaia.workflow.infra.manage.service.GaiaWorkflowLogService;
import cn.boommanpro.gaia.workflow.infra.manage.service.GaiaWorkflowService;
import cn.boommanpro.gaia.workflow.infra.manage.service.GaiaWorkflowVersionService;
import cn.boommanpro.gaia.workflow.app.service.WorkflowDslValidator;
import cn.hutool.json.JSONUtil;
import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("api")
public class GaiaWorkflowExecuteController {

    /** 执行前预检开关：生效版本先过统一校验器，error 级问题毫秒级拒绝而不是跑一半才炸 */
    @Value("${workflow.execute.pre-validate:true}")
    private boolean executePreValidate;

    @Autowired
    private GaiaWorkflowService workflowService;

    @Autowired
    private GaiaWorkflowVersionService workflowVersionService;

    @Autowired
    private WorkflowExecutor workflowExecutor;

    @Autowired
    private GaiaWorkflowLogService workflowLogService;

    @PostMapping("execute/{workflowCode}")
    public Map<String, Object> execute(@PathVariable String workflowCode, @RequestBody Map<String, Object> inputs) {
        // 记录开始时间
        LocalDateTime startTime = LocalDateTime.now();
        String executionId = UUID.randomUUID().toString();

        // 根据工作流编码获取工作流信息
        QueryWrapper<GaiaWorkflow> workflowQueryWrapper = new QueryWrapper<>();
        workflowQueryWrapper.eq("workflow_code", workflowCode);
        GaiaWorkflow workflow = workflowService.getOne(workflowQueryWrapper);

        if (workflow == null) {
            // 记录失败日志
            recordWorkflowLog(workflowCode, "unknown", executionId, startTime, inputs, null, "工作流不存在: " + workflowCode, "FAILED");

            Map<String, Object> result = new HashMap<>();
            result.put("success", false);
            result.put("message", "工作流不存在: " + workflowCode);
            return result;
        }

        // 根据工作流编码和当前版本ID获取工作流版本数据
        QueryWrapper<GaiaWorkflowVersion> versionQueryWrapper = new QueryWrapper<>();
        versionQueryWrapper.eq("workflow_code", workflowCode)
                .eq("id", workflow.getCurrentVersionId())
                .eq("is_current", 1);
        GaiaWorkflowVersion workflowVersion = workflowVersionService.getOne(versionQueryWrapper);

        if (workflowVersion == null) {
            // 记录失败日志
            recordWorkflowLog(workflowCode, "unknown", executionId, startTime, inputs, null, "工作流版本不存在", "FAILED");

            Map<String, Object> result = new HashMap<>();
            result.put("success", false);
            result.put("message", "工作流版本不存在: " + workflowCode);
            return result;
        }

        // 执行前预检（2026-10-16 起）：生效版本必须是机器证明可执行的 schema。
        // 直接 POST /api/execute 的调用方此前连「事后补偿」都没有，坏 schema 只会在引擎深处炸。
        if (executePreValidate) {
            java.util.List<WorkflowDslValidator.Issue> issues =
                WorkflowDslValidator.validate(workflowVersion.getWorkflowData());
            if (WorkflowDslValidator.hasErrors(issues)) {
                String message = "工作流校验未通过，拒绝执行：" + WorkflowDslValidator.errorSummary(issues)
                    + "（可用 workflow.execute.pre-validate=false 临时关闭预检）";
                recordWorkflowLog(workflowCode, workflowVersion.getVersionNumber(), executionId,
                    startTime, inputs, null, message, "FAILED");

                Map<String, Object> result = new HashMap<>();
                result.put("success", false);
                result.put("message", message);
                result.put("issues", issues);
                return result;
            }
        }

        // 执行工作流
        try {
            String workflowSchema = workflowVersion.getWorkflowData();
            Map<String, Object> executionResult = workflowExecutor.execute(workflowSchema, inputs);

            // 记录成功日志
            recordWorkflowLog(workflowCode, workflowVersion.getVersionNumber(), executionId, startTime, inputs, executionResult, null, "SUCCESS");

            Map<String, Object> result = new HashMap<>();
            result.put("success", true);
            result.put("data", executionResult);
            result.put("message", "执行成功");
            return result;
        } catch (Exception e) {
            // 记录失败日志
            recordWorkflowLog(workflowCode, workflowVersion.getVersionNumber(), executionId, startTime, inputs, null, e.getMessage(), "FAILED");

            Map<String, Object> result = new HashMap<>();
            result.put("success", false);
            result.put("message", "执行失败: " + e.getMessage());
            return result;
        }
    }

    /**
     * 记录工作流执行日志
     *
     * @param workflowCode 工作流编码
     * @param versionNumber 版本号
     * @param executionId 执行ID
     * @param startTime 开始时间
     * @param inputs 输入参数
     * @param outputs 输出参数
     * @param errorMessage 错误信息
     * @param status 状态
     */
    private void recordWorkflowLog(String workflowCode, String versionNumber, String executionId,
                                   LocalDateTime startTime, Map<String, Object> inputs,
                                   Map<String, Object> outputs, String errorMessage, String status) {
        try {
            LocalDateTime endTime = LocalDateTime.now();
            Long executionDuration = java.time.Duration.between(startTime, endTime).toMillis();

            GaiaWorkflowLog log = new GaiaWorkflowLog();
            log.setWorkflowCode(workflowCode);
            log.setVersionNumber(versionNumber);
            log.setExecutionId(executionId);
            log.setStartTime(startTime);
            log.setEndTime(endTime);
            log.setStatus(status);
            log.setInputParams(JSONUtil.toJsonStr(inputs));
            log.setOutputParams(outputs != null ? JSONUtil.toJsonStr(outputs) : null);
            log.setErrorMessage(errorMessage);
            log.setExecutionDuration(executionDuration);
            // 标记来源通道，便于调用看板区分「对外 API 调用」与其它执行来源
            log.setInvokeChannel("api");
            log.setApiPath("/api/execute/" + workflowCode);

            workflowLogService.save(log);
        } catch (Exception e) {
            // 即使记录日志失败，也不影响主要业务流程
            System.err.println("记录工作流执行日志失败: " + e.getMessage());
        }
    }
}
