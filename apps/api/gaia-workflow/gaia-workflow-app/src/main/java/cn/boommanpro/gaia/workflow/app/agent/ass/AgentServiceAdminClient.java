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

/**
 * AgentScope Service 管理面客户端 —— 登录（Bearer）+ 托管 Agent 资源的创建/读取/更新。
 *
 * <p>与 {@link AgentServiceClient}（数据面，X-API-Key）分离：管理操作走
 * {@code POST /api/auth/login} 换取 JWT；token 失效（401）自动重登一次。</p>
 */
@Slf4j
@Component
public class AgentServiceAdminClient {

    private volatile String cachedToken;

    /** 登录并缓存 token（进程内缓存，401 时刷新） */
    public synchronized String login(AgentProviderConfigService.AsServiceConfig cfg, boolean force) {
        if (!force && cachedToken != null && !cachedToken.isEmpty()) {
            return cachedToken;
        }
        try {
            JSONObject body = new JSONObject()
                .set("username", cfg.getAdminUsername())
                .set("password", cfg.getAdminPassword());
            HttpURLConnection conn = open(cfg, "/api/auth/login", "POST");
            conn.setDoOutput(true);
            writeBody(conn, body.toString());
            int status = conn.getResponseCode();
            String resp = status >= 200 && status < 300 ? readBody(conn) : readError(conn);
            conn.disconnect();
            if (status < 200 || status >= 300) {
                throw new AgentServiceApiException(status, "登录失败 HTTP " + status + ": " + resp);
            }
            JSONObject json = new JSONObject(resp);
            String token = json.getStr("token", json.getStr("access_token", ""));
            if (token == null || token.isEmpty()) {
                throw new AgentServiceApiException(-1, "登录响应缺少 token 字段");
            }
            cachedToken = token;
            return token;
        } catch (AgentServiceApiException e) {
            throw e;
        } catch (Exception e) {
            throw new AgentServiceApiException(-1, "登录失败: " + e.getMessage());
        }
    }

    /** 创建托管 Agent（binding=managed + definition），返回响应 JSON（agent.id / definition） */
    public JSONObject createAgent(AgentProviderConfigService.AsServiceConfig cfg, String bodyJson) {
        JSONObject resp = managementCall(cfg, "POST", "/api/v1/agents", bodyJson, false);
        return resp;
    }

    /** 读取当前定义（含 version，PATCH 乐观锁用） */
    public JSONObject getDefinition(AgentProviderConfigService.AsServiceConfig cfg, String agentId) {
        return managementCall(cfg, "GET", "/api/v1/agents/" + agentId + "/definition", null, false);
    }

    /** 更新定义（body 需携带当前 version）。PATCH 走 java.net.http.HttpClient（JDK HttpURLConnection 不支持 PATCH） */
    public JSONObject patchDefinition(AgentProviderConfigService.AsServiceConfig cfg,
                                      String agentId, String bodyJson) {
        return patchViaHttpClient(cfg, "/api/v1/agents/" + agentId + "/definition", bodyJson);
    }

    /** 查询 Agent（存在性校验 / 取版本号） */
    public JSONObject getAgent(AgentProviderConfigService.AsServiceConfig cfg, String agentId) {
        return managementCall(cfg, "GET", "/api/v1/agents/" + agentId, null, false);
    }

    /** 更新 Agent 状态（如归档回收；body 带 status，建议携带当前 version 乐观锁） */
    public JSONObject patchAgentStatus(AgentProviderConfigService.AsServiceConfig cfg,
                                       String agentId, String bodyJson) {
        return patchViaHttpClient(cfg, "/api/v1/agents/" + agentId, bodyJson);
    }

    private static final java.net.http.HttpClient PATCH_CLIENT = java.net.http.HttpClient.newHttpClient();

    /** PATCH 统一走 java.net.http：带 401 重登重试 */
    private JSONObject patchViaHttpClient(AgentProviderConfigService.AsServiceConfig cfg,
                                          String path, String bodyJson) {
        return patchViaHttpClient(cfg, path, bodyJson, false);
    }

    private JSONObject patchViaHttpClient(AgentProviderConfigService.AsServiceConfig cfg,
                                          String path, String bodyJson, boolean retried) {
        String token = login(cfg, false);
        try {
            java.net.http.HttpRequest request = java.net.http.HttpRequest.newBuilder()
                .uri(java.net.URI.create(cfg.getBaseUrl() + path))
                .method("PATCH", java.net.http.HttpRequest.BodyPublishers.ofString(bodyJson))
                .timeout(java.time.Duration.ofMillis(Math.max(cfg.getReadTimeoutMs(), 1000)))
                .header("Authorization", "Bearer " + token)
                .header("X-AgentScope-Tenant", cfg.getTenant())
                .header("X-AgentScope-Namespace", cfg.getNamespace())
                .header("Content-Type", "application/json")
                .build();
            java.net.http.HttpResponse<String> resp =
                PATCH_CLIENT.send(request, java.net.http.HttpResponse.BodyHandlers.ofString());
            if (resp.statusCode() == 401 && !retried) {
                login(cfg, true);
                return patchViaHttpClient(cfg, path, bodyJson, true);
            }
            if (resp.statusCode() < 200 || resp.statusCode() >= 300) {
                throw new AgentServiceApiException(resp.statusCode(),
                    "PATCH " + path + " 失败 HTTP " + resp.statusCode() + ": " + resp.body());
            }
            return resp.body() == null || resp.body().isEmpty()
                ? new JSONObject() : new JSONObject(resp.body());
        } catch (AgentServiceApiException e) {
            throw e;
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new AgentServiceApiException(-1, "PATCH " + path + " 被中断");
        } catch (Exception e) {
            throw new AgentServiceApiException(-1, "PATCH " + path + " 失败: " + e.getMessage());
        }
    }

    private JSONObject managementCall(AgentProviderConfigService.AsServiceConfig cfg,
                                      String method, String path, String body, boolean retried) {
        String token = login(cfg, false);
        HttpURLConnection conn = null;
        try {
            conn = open(cfg, path, method);
            conn.setRequestProperty("Authorization", "Bearer " + token);
            conn.setRequestProperty("X-AgentScope-Tenant", cfg.getTenant());
            conn.setRequestProperty("X-AgentScope-Namespace", cfg.getNamespace());
            if (body != null) {
                conn.setRequestProperty("Content-Type", "application/json");
                conn.setDoOutput(true);
                writeBody(conn, body);
            }
            int status = conn.getResponseCode();
            if (status == 401 && !retried) {
                // token 过期：强制重登后重试一次
                login(cfg, true);
                conn.disconnect();
                return managementCall(cfg, method, path, body, true);
            }
            String resp = status >= 200 && status < 300 ? readBody(conn) : readError(conn);
            if (status < 200 || status >= 300) {
                throw new AgentServiceApiException(status, method + " " + path + " 失败 HTTP " + status + ": " + resp);
            }
            return resp == null || resp.isEmpty() ? new JSONObject() : new JSONObject(resp);
        } catch (AgentServiceApiException e) {
            throw e;
        } catch (Exception e) {
            throw new AgentServiceApiException(-1, method + " " + path + " 失败: " + e.getMessage());
        } finally {
            if (conn != null) {
                conn.disconnect();
            }
        }
    }

    private HttpURLConnection open(AgentProviderConfigService.AsServiceConfig cfg, String path, String method)
            throws Exception {
        URL url = new URL(cfg.getBaseUrl() + path);
        HttpURLConnection conn = (HttpURLConnection) url.openConnection();
        conn.setRequestMethod(method);
        conn.setRequestProperty("Accept", "application/json");
        conn.setConnectTimeout(cfg.getConnectTimeoutMs());
        conn.setReadTimeout(cfg.getReadTimeoutMs());
        return conn;
    }

    private void writeBody(HttpURLConnection conn, String body) throws Exception {
        try (OutputStream os = conn.getOutputStream()) {
            os.write(body.getBytes(StandardCharsets.UTF_8));
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
}
