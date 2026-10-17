package cn.boommanpro.gaia.workflow.app.agent.ass;

import cn.boommanpro.gaia.workflow.app.service.AgentProviderConfigService;
import cn.hutool.json.JSONObject;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.UUID;

/**
 * AgentScope Service（自托管）Session API 客户端 —— 纯协议封装，不含编排逻辑。
 *
 * <p>协议要点（依据 v2.1.0 官方文档与本地 2.1.0-BETA1 实测）：</p>
 * <ul>
 *   <li>Base URL 形如 {@code http://localhost:18080}，鉴权 {@code X-API-Key}（应用凭据，
 *       在 Service 控制台 Applications → Credentials 签发，scopes 至少含 invoke/read/interact）</li>
 *   <li>建会话 {@code POST /api/v1/agent-sessions}，body {@code {"target":{"type":"agent","id":...}}}，
 *       要求 {@code Idempotency-Key}；Session 冻结目标 Agent 的定义快照</li>
 *   <li>提交 Turn {@code POST .../turns}，body {@code {"message":"..."}}，返回 202 受理</li>
 *   <li>事件流 {@code GET .../events/stream}（SSE，{@code id:}/{@code event:}/{@code data:} 帧，
 *       {@code id:} 即游标 cursor）；事件类型实测词汇：item.delta / item.started / item.completed /
 *       tool.requested / tool.dispatched / tool.completed / usage.recorded / run.started /
 *       run.ended / session.status_running / session.status_idle / turn.accepted /
 *       turn.dispatching / turn.running / turn.completed / turn.failed</li>
 *   <li>取消 {@code POST .../turns/{turnId}/cancel}</li>
 * </ul>
 *
 * <p>HTTP 实现沿用 {@code ArkManagedClient} 的 HttpURLConnection 风格，不引入第三方 SDK。</p>
 */
@Slf4j
@Component
public class AgentServiceClient {

    private static final String SESSIONS_PATH = "/api/v1/agent-sessions";

    private final AgentServiceAdminClient adminClient;

    public AgentServiceClient(AgentServiceAdminClient adminClient) {
        this.adminClient = adminClient;
    }

    /**
     * 应用鉴权头：authMode=admin（默认）用管理面身份 Bearer（自动覆盖按会话新建的 Agent）；
     * authMode=apiKey 用应用凭据 X-API-Key（targets 需显式授权每个 Agent）。
     */
    private void applyAuth(HttpURLConnection conn, AgentProviderConfigService.AsServiceConfig cfg) {
        if ("apiKey".equalsIgnoreCase(cfg.getAuthMode())
            && cfg.getApiKey() != null && !cfg.getApiKey().isEmpty()) {
            conn.setRequestProperty("X-API-Key", cfg.getApiKey());
        } else {
            conn.setRequestProperty("Authorization", "Bearer " + adminClient.login(cfg, false));
        }
        // Session API 按租户/命名空间解析目标 Agent，缺省会落错作用域（store: not found）
        if (cfg.getTenant() != null && !cfg.getTenant().isEmpty()) {
            conn.setRequestProperty("X-AgentScope-Tenant", cfg.getTenant());
        }
        if (cfg.getNamespace() != null && !cfg.getNamespace().isEmpty()) {
            conn.setRequestProperty("X-AgentScope-Namespace", cfg.getNamespace());
        }
    }

    /** 建连等待首帧的上限（SSE 无 : ready 注释行，以 HTTP 200 + 首帧/超时为准） */
    private static final long READY_TIMEOUT_SECONDS = 30;

    /** 创建 Session（幂等键 = 本地会话级稳定值，重试返回同一 Session） */
    public JSONObject createSession(AgentProviderConfigService.AsServiceConfig cfg,
                                    String agentId, String idempotencyKey) {
        JSONObject body = new JSONObject();
        body.set("target", new JSONObject().set("type", "agent").set("id", agentId));
        return postJson(cfg, SESSIONS_PATH, body.toString(), idempotencyKey);
    }

    /** 提交 Turn（文本消息）。返回受理回执：{id, status:"queued", eventsUrl, statusUrl} */
    public JSONObject submitTurn(AgentProviderConfigService.AsServiceConfig cfg,
                                 String sessionId, String message, String idempotencyKey) {
        JSONObject body = new JSONObject().set("message", message);
        return postJson(cfg, SESSIONS_PATH + "/" + sessionId + "/turns", body.toString(), idempotencyKey);
    }

    /** 查询 Turn（status: queued/running/completed/failed/cancelled/...，终态含 result 或 error） */
    public JSONObject getTurn(AgentProviderConfigService.AsServiceConfig cfg, String sessionId, String turnId) {
        return getJson(cfg, SESSIONS_PATH + "/" + sessionId + "/turns/" + turnId);
    }

    /**
     * 读取 Service 会话快照（items/turns/usage 全量视图）。
     * Gaia「Service 对话」视图的数据源：Service 控制台对应用创建的会话没有浏览 UI，
     * 由本服务代理读取后交给前端渲染。
     */
    public JSONObject getSessionSnapshot(AgentProviderConfigService.AsServiceConfig cfg, String sessionId) {
        return getJson(cfg, SESSIONS_PATH + "/" + sessionId + "/snapshot");
    }

    /** 取消 Turn（用户停止时调用） */
    public void cancelTurn(AgentProviderConfigService.AsServiceConfig cfg, String sessionId, String turnId) {
        try {
            postJson(cfg, SESSIONS_PATH + "/" + sessionId + "/turns/" + turnId + "/cancel", "{}", null);
        } catch (Exception e) {
            log.warn("[ass-client] 取消 Turn 失败（忽略）: {}", e.getMessage());
        }
    }

    /**
     * 拉取会话事件（GET /events，一次性读取，控制面每次全量投影后返回，实测可靠）。
     * 返回原始响应：{data:[...], next_cursor}；after 传上次 next_cursor 可增量读取。
     *
     * <p>注：本部署实测控制面的 {@code /events/stream}（SSE 代理循环）会在首批事件后静默
     * （BETA1 缺陷），引擎改用游标增量轮询本接口获取事件。</p>
     */
    public JSONObject getEvents(AgentProviderConfigService.AsServiceConfig cfg, String sessionId, String after) {
        String path = SESSIONS_PATH + "/" + sessionId + "/events"
            + (after != null && !after.isEmpty() ? "?after=" + after : "");
        return getJson(cfg, path);
    }

    // ---------------- HTTP 基础 ----------------

    private JSONObject postJson(AgentProviderConfigService.AsServiceConfig cfg, String path,
                                String body, String idempotencyKey) {
        HttpURLConnection conn = null;
        try {
            URL url = new URL(cfg.getBaseUrl() + path);
            conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("POST");
            applyAuth(conn, cfg);
            conn.setRequestProperty("Content-Type", "application/json");
            if (idempotencyKey != null && !idempotencyKey.isEmpty()) {
                conn.setRequestProperty("Idempotency-Key", idempotencyKey);
            }
            conn.setConnectTimeout(cfg.getConnectTimeoutMs());
            conn.setReadTimeout(cfg.getReadTimeoutMs());
            conn.setDoOutput(true);
            try (OutputStream os = conn.getOutputStream()) {
                os.write(body.getBytes(StandardCharsets.UTF_8));
            }
            int status = conn.getResponseCode();
            String resp = status >= 200 && status < 300 ? readBody(conn) : readError(conn);
            if (status < 200 || status >= 300) {
                throw new AgentServiceApiException(status, "POST " + path + " 失败 HTTP " + status + ": " + resp);
            }
            return resp == null || resp.isEmpty() ? new JSONObject() : new JSONObject(resp);
        } catch (AgentServiceApiException e) {
            throw e;
        } catch (Exception e) {
            throw new AgentServiceApiException(-1, "POST " + path + " 失败: " + e.getMessage());
        } finally {
            if (conn != null) {
                conn.disconnect();
            }
        }
    }

    private JSONObject getJson(AgentProviderConfigService.AsServiceConfig cfg, String path) {
        HttpURLConnection conn = null;
        try {
            URL url = new URL(cfg.getBaseUrl() + path);
            conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("GET");
            applyAuth(conn, cfg);
            conn.setConnectTimeout(cfg.getConnectTimeoutMs());
            conn.setReadTimeout(cfg.getReadTimeoutMs());
            int status = conn.getResponseCode();
            String resp = status >= 200 && status < 300 ? readBody(conn) : readError(conn);
            if (status < 200 || status >= 300) {
                throw new AgentServiceApiException(status, "GET " + path + " 失败 HTTP " + status + ": " + resp);
            }
            return resp == null || resp.isEmpty() ? new JSONObject() : new JSONObject(resp);
        } catch (AgentServiceApiException e) {
            throw e;
        } catch (Exception e) {
            throw new AgentServiceApiException(-1, "GET " + path + " 失败: " + e.getMessage());
        } finally {
            if (conn != null) {
                conn.disconnect();
            }
        }
    }

    private String readBody(HttpURLConnection conn) throws Exception {
        try (BufferedReader reader = new BufferedReader(
                new InputStreamReader(conn.getInputStream(), StandardCharsets.UTF_8))) {
            StringBuilder sb = new StringBuilder();
            String line;
            while ((line = reader.readLine()) != null) {
                sb.append(line);
            }
            return sb.toString();
        }
    }

    private String readError(HttpURLConnection conn) {
        try (BufferedReader reader = new BufferedReader(
                new InputStreamReader(conn.getErrorStream(), StandardCharsets.UTF_8))) {
            StringBuilder sb = new StringBuilder();
            String line;
            while ((line = reader.readLine()) != null) {
                sb.append(line);
            }
            return sb.toString();
        } catch (Exception e) {
            return "";
        }
    }

    /** 稳定幂等键（同本地会话多次创建返回同一远端 Session） */
    public static String idempotencyKey(String prefix, String sessionKey) {
        return prefix + "-" + UUID.nameUUIDFromBytes(sessionKey.getBytes(StandardCharsets.UTF_8));
    }
}
