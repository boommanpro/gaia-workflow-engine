package cn.boommanpro.gaia.workflow.app.config;

import cn.boommanpro.gaia.workflow.infra.manage.entity.GaiaWorkflowApi;
import cn.boommanpro.gaia.workflow.infra.manage.entity.GaiaWorkflowLog;
import cn.boommanpro.gaia.workflow.infra.manage.service.GaiaWorkflowApiService;
import cn.boommanpro.gaia.workflow.infra.manage.service.GaiaWorkflowLogService;
import cn.hutool.json.JSONUtil;
import lombok.extern.slf4j.Slf4j;
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
 * 对外端点鉴权拦截器：校验 {@code X-API-Key} 头，两类覆盖面——
 *
 * <ul>
 *   <li>/api/v1/wf/{code}（工作流级）：gaia_workflow_api 表按工作流校验，
 *       通过后把 GaiaWorkflowApi 挂到 request attribute 供控制器复用</li>
 *   <li>/mcp/gaia/**（实例级）：agent.security.api-keys（env GAIA_API_KEY）静态 key
 *       校验——对外 MCP 控制面。未配置任何 key 时放行（本地/desktop 单机信任模式）</li>
 * </ul>
 *
 * 鉴权失败的请求不会进入控制器，因此 /api/v1/wf 在这里补一条 FAILED 调用日志——
 * 否则看板的「失败分布」里永远看不到最常见的 401，指标会失真。
 */
@Slf4j
@Component
public class ApiKeyAuthInterceptor implements HandlerInterceptor {

    @Autowired
    private GaiaWorkflowApiService apiService;

    @Autowired
    private GaiaWorkflowLogService logService;

    @Autowired
    private AgentProperties agentProperties;

    private static final Pattern PATH_PATTERN = Pattern.compile("/api/v1/wf/([^/]+)$");
    private static final Pattern MCP_PATH_PATTERN = Pattern.compile("^/mcp/gaia/[^/]+$");

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
        // CORS 预检请求不带自定义头，必须放行，否则浏览器侧调用会被提前拦成 401
        if ("OPTIONS".equalsIgnoreCase(request.getMethod())) {
            return true;
        }
        String uri = request.getRequestURI();
        if (MCP_PATH_PATTERN.matcher(uri).find()) {
            return instanceKeyAuth(request, response);
        }
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

    /**
     * 实例级 key 校验（/mcp/gaia/** 控制面）。未配置任何 key = 本地信任模式直接放行；
     * 配置后 X-API-Key 必须命中其一。MCP 面没有 workflowCode 维度，不计入工作流调用看板。
     */
    private boolean instanceKeyAuth(HttpServletRequest request, HttpServletResponse response) throws Exception {
        String configured = agentProperties.getSecurity() != null
            ? agentProperties.getSecurity().getApiKeys() : null;
        if (configured == null || configured.trim().isEmpty()) {
            return true;
        }
        String apiKey = request.getHeader("X-API-Key");
        if (apiKey != null && !apiKey.isEmpty()) {
            for (String candidate : configured.split(",")) {
                if (apiKey.equals(candidate.trim())) {
                    return true;
                }
            }
        }
        log.warn("[api-key] MCP 端点鉴权失败 uri={} keyPrefix={}",
            request.getRequestURI(), prefix(apiKey));
        writeUnauthorized(response, "API Key 缺失或无效（对外 MCP 端点需配置 agent.security.api-keys 中的实例级 X-API-Key）");
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
