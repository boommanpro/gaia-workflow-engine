package cn.boommanpro.gaia.workflow.app.controller.api;

import cn.boommanpro.gaia.workflow.infra.manage.entity.GaiaWorkflow;
import cn.boommanpro.gaia.workflow.infra.manage.entity.GaiaWorkflowApi;
import cn.boommanpro.gaia.workflow.infra.manage.entity.GaiaWorkflowLog;
import cn.boommanpro.gaia.workflow.infra.manage.entity.GaiaWorkflowVersion;
import cn.boommanpro.gaia.workflow.infra.manage.service.GaiaWorkflowApiService;
import cn.boommanpro.gaia.workflow.infra.manage.service.GaiaWorkflowLogService;
import cn.boommanpro.gaia.workflow.infra.manage.service.GaiaWorkflowService;
import cn.boommanpro.gaia.workflow.infra.manage.service.GaiaWorkflowVersionService;
import cn.boommanpro.gaia.workflow.app.executor.WorkflowExecutor;
import cn.hutool.json.JSONUtil;
import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import javax.servlet.http.HttpServletRequest;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

/**
 * 对外 API 调用端点：POST /api/v1/wf/{workflowCode}
 * 鉴权由 {@link cn.boommanpro.gaia.workflow.app.config.ApiKeyAuthInterceptor} 负责，
 * 通过后在 request attribute 中挂载已校验的 GaiaWorkflowApi。
 */
@RestController
@RequestMapping("api")
public class GaiaWorkflowApiInvokeController {

    @Autowired
    private GaiaWorkflowService workflowService;
    @Autowired
    private GaiaWorkflowVersionService workflowVersionService;
    @Autowired
    private WorkflowExecutor workflowExecutor;
    @Autowired
    private GaiaWorkflowLogService workflowLogService;
    @Autowired
    private GaiaWorkflowApiService apiService;

    @PostMapping("v1/wf/{workflowCode}")
    public Map<String, Object> invoke(@PathVariable String workflowCode,
                                      @RequestBody Map<String, Object> inputs,
                                      HttpServletRequest request) {
        LocalDateTime startTime = LocalDateTime.now();
        String executionId = UUID.randomUUID().toString();

        // 取自鉴权拦截器已校验的记录（理论上非空）
        GaiaWorkflowApi api = (GaiaWorkflowApi) request.getAttribute("gaiaApi");
        if (api == null) {
            String key = request.getHeader("X-API-Key");
            api = (key != null) ? apiService.getByCodeAndKey(workflowCode, key) : null;
        }
        if (api == null) {
            recordLog(workflowCode, "unknown", executionId, startTime, inputs, null,
                    "API Key 无效或工作流未发布", "FAILED", null, null, null);
            return fail(401, "API Key 无效或工作流未发布");
        }

        QueryWrapper<GaiaWorkflow> wq = new QueryWrapper<>();
        wq.eq("workflow_code", workflowCode);
        GaiaWorkflow workflow = workflowService.getOne(wq);
        if (workflow == null) {
            recordLog(workflowCode, "unknown", executionId, startTime, inputs, null,
                    "工作流不存在: " + workflowCode, "FAILED", api.getApiPath(), maskPrefix(api.getApiKey()), null);
            return fail(404, "工作流不存在: " + workflowCode);
        }

        QueryWrapper<GaiaWorkflowVersion> vq = new QueryWrapper<>();
        vq.eq("workflow_code", workflowCode).eq("id", workflow.getCurrentVersionId()).eq("is_current", 1);
        GaiaWorkflowVersion version = workflowVersionService.getOne(vq);
        if (version == null) {
            recordLog(workflowCode, "unknown", executionId, startTime, inputs, null,
                    "工作流版本不存在", "FAILED", api.getApiPath(), maskPrefix(api.getApiKey()), null);
            return fail(404, "工作流版本不存在: " + workflowCode);
        }

        try {
            String schema = version.getWorkflowData();
            Map<String, Object> result = workflowExecutor.execute(schema, inputs);
            recordLog(workflowCode, version.getVersionNumber(), executionId, startTime, inputs, result,
                    null, "SUCCESS", api.getApiPath(), maskPrefix(api.getApiKey()), null);
            Map<String, Object> r = new HashMap<>();
            r.put("success", true);
            r.put("data", result);
            r.put("message", "执行成功");
            r.put("executionId", executionId);
            return r;
        } catch (Exception e) {
            recordLog(workflowCode, version.getVersionNumber(), executionId, startTime, inputs, null,
                    e.getMessage(), "FAILED", api.getApiPath(), maskPrefix(api.getApiKey()), null);
            return fail(500, "执行失败: " + e.getMessage());
        }
    }

    private Map<String, Object> fail(int code, String message) {
        Map<String, Object> r = new HashMap<>();
        r.put("success", false);
        r.put("code", String.valueOf(code));
        r.put("message", message);
        return r;
    }

    private void recordLog(String workflowCode, String versionNumber, String executionId,
                           LocalDateTime startTime, Map<String, Object> inputs, Map<String, Object> outputs,
                           String errorMessage, String status, String apiPath, String apiKeyPrefix, String channel) {
        try {
            LocalDateTime endTime = LocalDateTime.now();
            Long duration = java.time.Duration.between(startTime, endTime).toMillis();
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
            log.setExecutionDuration(duration);
            log.setInvokeChannel(channel != null ? channel : "api");
            log.setApiPath(apiPath);
            log.setApiKeyPrefix(apiKeyPrefix);
            workflowLogService.save(log);
        } catch (Exception e) {
            System.err.println("记录 API 调用日志失败: " + e.getMessage());
        }
    }

    private static String maskPrefix(String key) {
        if (key == null || key.length() <= 8) return key;
        return key.substring(0, 8);
    }
}
