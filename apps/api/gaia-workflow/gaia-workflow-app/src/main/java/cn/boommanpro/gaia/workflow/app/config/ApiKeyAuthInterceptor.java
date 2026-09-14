package cn.boommanpro.gaia.workflow.app.config;

import cn.boommanpro.gaia.workflow.infra.manage.entity.GaiaWorkflowApi;
import cn.boommanpro.gaia.workflow.infra.manage.entity.GaiaWorkflowLog;
import cn.boommanpro.gaia.workflow.infra.manage.service.GaiaWorkflowApiService;
import cn.boommanpro.gaia.workflow.infra.manage.service.GaiaWorkflowLogService;
import cn.hutool.json.JSONUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * 对外 API 调用鉴权拦截器：校验 {@code X-API-Key} 头。
 * 命中 /api/v1/wf/** 时校验，校验通过后把 GaiaWorkflowApi 挂到 request attribute 供控制器复用。
 *
 * 鉴权失败的请求不会进入控制器，因此在这里补一条 FAILED 调用日志——
 * 否则看板的「失败分布」里永远看不到最常见的 401，指标会失真。
 */
@Component
public class ApiKeyAuthInterceptor implements HandlerInterceptor {

    @Autowired
    private GaiaWorkflowApiService apiService;

    @Autowired
    private GaiaWorkflowLogService logService;

    private static final Pattern PATH_PATTERN = Pattern.compile("/api/v1/wf/([^/]+)$");

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
        // CORS 预检请求不带自定义头，必须放行，否则浏览器侧调用会被提前拦成 401
        if ("OPTIONS".equalsIgnoreCase(request.getMethod())) {
            return true;
        }
        String uri = request.getRequestURI();
        Matcher matcher = PATH_PATTERN.matcher(uri);
        if (!matcher.find()) {
            return true;
        }
        String workflowCode = matcher.group(1);
        String apiKey = request.getHeader("X-API-Key");
        String reason = null;
        if (apiKey == null || apiKey.isEmpty()) {
            reason = "API Key 缺失";
        } else {
            GaiaWorkflowApi api = apiService.getByCodeAndKey(workflowCode, apiKey);
            if (api == null) {
                reason = "API Key 无效或工作流未发布";
            } else {
                request.setAttribute("gaiaApi", api);
                return true;
            }
        }
        recordAuthFailure(workflowCode, reason, apiKey);
        writeUnauthorized(response, reason);
        return false;
    }

    /** 鉴权失败也计入调用看板，便于发现 Key 泄漏 / 配置错误 */
    private void recordAuthFailure(String workflowCode, String reason, String apiKey) {
        try {
            LocalDateTime now = LocalDateTime.now();
            GaiaWorkflowLog log = new GaiaWorkflowLog();
            log.setWorkflowCode(workflowCode);
            log.setVersionNumber("unknown");
            log.setExecutionId(UUID.randomUUID().toString());
            log.setStartTime(now);
            log.setEndTime(now);
            log.setStatus("FAILED");
            log.setErrorMessage(reason);
            log.setExecutionDuration(0L);
            log.setInvokeChannel("api");
            log.setApiPath("/api/v1/wf/" + workflowCode);
            log.setApiKeyPrefix(prefix(apiKey));
            log.setCreatedAt(now);
            logService.save(log);
        } catch (Exception ignored) {
            // 记录日志失败不影响鉴权结论
        }
    }

    private static String prefix(String key) {
        if (key == null || key.length() <= 8) return null;
        return key.substring(0, 8);
    }

    private void writeUnauthorized(HttpServletResponse response, String message) throws Exception {
        response.setStatus(401);
        response.setContentType("application/json;charset=UTF-8");
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("success", false);
        body.put("code", "401");
        body.put("message", message);
        response.getWriter().write(JSONUtil.toJsonStr(body));
    }
}
