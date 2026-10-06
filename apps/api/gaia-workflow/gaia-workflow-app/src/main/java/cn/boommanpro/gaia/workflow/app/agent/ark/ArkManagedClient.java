package cn.boommanpro.gaia.workflow.app.agent.ark;

import cn.boommanpro.gaia.workflow.app.service.AgentProviderConfigService;
import cn.hutool.json.JSONArray;
import cn.hutool.json.JSONObject;
import cn.hutool.json.JSONUtil;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.function.Consumer;

/**
 * 火山方舟 Managed Agents 的纯 HTTP 客户端 —— 只做协议封装，不含任何编排逻辑。
 *
 * <p>协议要点（均依据官方文档「Session 事件流」「启动 Session」）：</p>
 * <ul>
 *   <li>Base URL {@code https://ark.cn-beijing.volces.com/api/v3}，鉴权 {@code Authorization: Bearer}</li>
 *   <li>发事件 {@code POST /sessions/{id}/events}，body 为 {"events":[...]}，串行入队；
 *       队列满返回 409</li>
 *   <li>收事件流 {@code GET /sessions/{id}/events/stream}（SSE）：
 *       <b>必须先开流再发消息</b>，建连成功以注释行 {@code : ready} 为信号</li>
 *   <li>历史事件 {@code GET /sessions/{id}/events}，分页字段 next_page，
 *       断线重连时与实时流按事件 id 去重合并</li>
 * </ul>
 *
 * <p>HTTP 实现沿用 {@code OpenAiCompatibleLlmProvider} 的 HttpURLConnection 风格，
 * 不引入第三方 SDK。</p>
 */
@Slf4j
@Component
public class ArkManagedClient {

    /** 建连等待 {@code : ready} 的上限 */
    private static final long READY_TIMEOUT_SECONDS = 30;

    /**
     * 创建 Session。agent 传对象形式（{id, version}）可固定版本；version 为 null 时传字符串用最新版。
     */
    public JSONObject createSession(AgentProviderConfigService.ArkConfig cfg,
                                    String agentId, Integer agentVersion, String title) {
        JSONObject body = new JSONObject();
        if (agentVersion != null) {
            body.set("agent", new JSONObject().set("type", "agent").set("id", agentId).set("version", agentVersion));
        } else {
            body.set("agent", agentId);
        }
        if (cfg.getEnvironmentId() != null && !cfg.getEnvironmentId().isEmpty()) {
            body.set("environment_id", cfg.getEnvironmentId());
        }
        if (title != null && !title.isEmpty()) {
            body.set("title", title);
        }
        return postJson(cfg, "/sessions", body.toString());
    }

    /** 查询 Session（状态机 / 用量 / 绑定的 Agent 快照） */
    public JSONObject getSession(AgentProviderConfigService.ArkConfig cfg, String sessionId) {
        return getJson(cfg, "/sessions/" + sessionId);
    }

    /**
     * 删除 Session（不可逆，仅接受 idle/terminated 状态）。
     * 会永久移除 Session 记录、所有事件并释放关联沙箱 —— 用量冒烟测试与清理场景使用。
     */
    public void deleteSession(AgentProviderConfigService.ArkConfig cfg, String sessionId) {
        delete(cfg, "/sessions/" + sessionId);
    }

    /** 列出账号下的 Environment（校验 provider_config:ark.environmentId 是否存在时使用） */
    public JSONObject listEnvironments(AgentProviderConfigService.ArkConfig cfg) {
        return getJson(cfg, "/environments");
    }

    /**
     * 向 Session 发送一批事件。服务端按入队顺序串行处理；
     * 返回 data 数组为服务端受理回执（processed_at 为 null 表示仍在队列）。
     */
    public JSONObject sendEvents(AgentProviderConfigService.ArkConfig cfg, String sessionId, JSONArray events) {
        JSONObject body = new JSONObject().set("events", events);
        return postJson(cfg, "/sessions/" + sessionId + "/events", body.toString());
    }

    /** 拉取历史事件（一页）。返回原始响应：data 数组 + next_page（无则无该字段） */
    public JSONObject getEventHistoryPage(AgentProviderConfigService.ArkConfig cfg, String sessionId, String page) {
        String path = "/sessions/" + sessionId + "/events" + (page != null && !page.isEmpty() ? "?page=" + page : "");
        return getJson(cfg, path);
    }

    /**
     * 打开 SSE 事件流并阻塞等待 {@code : ready} 建连信号。
     * 返回的 {@link StreamHandle} 在独立线程逐条回调 {@code eventConsumer}（payload 已解析为 JSON）。
     *
     * @throws ArkApiException 建连失败或 ready 超时
     */
    public StreamHandle openEventStream(AgentProviderConfigService.ArkConfig cfg, String sessionId,
                                        Consumer<JSONObject> eventConsumer, Runnable onClosed) {
        HttpURLConnection conn = null;
        try {
            URL url = new URL(cfg.getBaseUrl() + "/sessions/" + sessionId + "/events/stream");
            conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("GET");
            conn.setRequestProperty("Authorization", "Bearer " + cfg.getApiKey());
            conn.setRequestProperty("Accept", "text/event-stream");
            conn.setConnectTimeout(cfg.getConnectTimeoutMs());
            conn.setReadTimeout(cfg.getReadTimeoutMs());
            int status = conn.getResponseCode();
            if (status != 200) {
                String err = readError(conn);
                throw new ArkApiException(status, "打开事件流失败 HTTP " + status + ": " + err);
            }
        } catch (ArkApiException e) {
            throw e;
        } catch (Exception e) {
            throw new ArkApiException(-1, "打开事件流失败: " + e.getMessage());
        }

        StreamHandle handle = new StreamHandle(conn, onClosed);
        Thread reader = new Thread(() -> readSseLoop(handle, eventConsumer), "ark-sse-" + sessionId);
        reader.setDaemon(true);
        reader.start();

        try {
            if (!handle.readyLatch().await(READY_TIMEOUT_SECONDS, TimeUnit.SECONDS)) {
                handle.close();
                throw new ArkApiException(-1, "等待事件流建连信号超时（" + READY_TIMEOUT_SECONDS + "s 未收到 : ready）");
            }
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            handle.close();
            throw new ArkApiException(-1, "等待事件流建连被中断");
        }
        return handle;
    }

    // ---------------- SSE 读取 ----------------

    /**
     * SSE 行循环：{@code :} 注释行视为心跳/建连信号（首个 {@code : ready} 触发 readyLatch）；
     * {@code data:} 行累积为事件负载，空行派发。事件 JSON 内的 {@code type} 字段是权威类型，
     * {@code event:} 行忽略不解析。
     */
    private void readSseLoop(StreamHandle handle, Consumer<JSONObject> eventConsumer) {
        StringBuilder dataBuffer = new StringBuilder();
        try (BufferedReader reader = new BufferedReader(
                new InputStreamReader(handle.connection.getInputStream(), StandardCharsets.UTF_8))) {
            String line;
            while (!handle.closed().get() && (line = reader.readLine()) != null) {
                if (line.startsWith(":")) {
                    if (handle.readyLatch().getCount() != 0L) {
                        handle.readyLatch().countDown(); // 首个注释行（官方协议为 ": ready"）即建连信号
                    }
                    continue;
                }
                if (line.startsWith("data:")) {
                    String payload = line.substring(5).trim();
                    if (!payload.isEmpty()) {
                        dataBuffer.append(payload);
                    }
                    continue;
                }
                if (line.isEmpty() && dataBuffer.length() > 0) {
                    dispatch(dataBuffer.toString(), eventConsumer);
                    dataBuffer.setLength(0);
                }
            }
        } catch (Exception e) {
            if (!handle.closed().get()) {
                log.warn("[ark-client] SSE 读取异常（连接断开）: {}", e.getMessage());
            }
        } finally {
            handle.close();
        }
    }

    private void dispatch(String payload, Consumer<JSONObject> eventConsumer) {
        try {
            JSONObject event = JSONUtil.parseObj(payload);
            eventConsumer.accept(event);
        } catch (Exception e) {
            log.warn("[ark-client] 无法解析事件 payload（已忽略）: {}", payload, e);
        }
    }

    // ---------------- Agent 资源（自动同步用） ----------------

    /**
     * 创建方舟 Agent。body 形如：
     * {name, model:{id}, description, system, tools:[{type:"agent_toolset_20260701"} |
     *  {type:"custom", name, description, input_schema}]}
     * 返回 {id: "agent-...", version: 1, ...}。
     */
    public JSONObject createAgent(AgentProviderConfigService.ArkConfig cfg, String body) {
        return postJson(cfg, "/agents", body);
    }

    /**
     * 更新方舟 Agent（必须携带当前 version，成功后生成新版本）。
     * 返回包含新 version 的 Agent 对象。
     */
    public JSONObject updateAgent(AgentProviderConfigService.ArkConfig cfg, String agentId, String body) {
        return postJson(cfg, "/agents/" + agentId, body);
    }

    /**
     * 分页列出账号下的 Agent（按创建时间倒序），用于乐观锁冲突时找回当前版本号。
     */
    public JSONObject listAgents(AgentProviderConfigService.ArkConfig cfg, int limit) {
        return getJson(cfg, "/agents?limit=" + limit);
    }

    // ---------------- HTTP 基础 ----------------

    private JSONObject postJson(AgentProviderConfigService.ArkConfig cfg, String path, String body) {
        HttpURLConnection conn = null;
        try {
            URL url = new URL(cfg.getBaseUrl() + path);
            conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("POST");
            conn.setRequestProperty("Authorization", "Bearer " + cfg.getApiKey());
            conn.setRequestProperty("Content-Type", "application/json");
            conn.setConnectTimeout(cfg.getConnectTimeoutMs());
            conn.setReadTimeout(cfg.getReadTimeoutMs());
            conn.setDoOutput(true);
            try (OutputStream os = conn.getOutputStream()) {
                os.write(body.getBytes(StandardCharsets.UTF_8));
            }
            int status = conn.getResponseCode();
            if (status >= 300) {
                throw new ArkApiException(status, "POST " + path + " 失败 HTTP " + status + ": " + readError(conn));
            }
            return JSONUtil.parseObj(readBody(conn.getInputStream()));
        } catch (ArkApiException e) {
            throw e;
        } catch (Exception e) {
            throw new ArkApiException(-1, "POST " + path + " 失败: " + e.getMessage());
        } finally {
            if (conn != null) {
                conn.disconnect();
            }
        }
    }

    private JSONObject getJson(AgentProviderConfigService.ArkConfig cfg, String path) {
        HttpURLConnection conn = null;
        try {
            URL url = new URL(cfg.getBaseUrl() + path);
            conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("GET");
            conn.setRequestProperty("Authorization", "Bearer " + cfg.getApiKey());
            conn.setConnectTimeout(cfg.getConnectTimeoutMs());
            conn.setReadTimeout(cfg.getReadTimeoutMs());
            int status = conn.getResponseCode();
            if (status >= 300) {
                throw new ArkApiException(status, "GET " + path + " 失败 HTTP " + status + ": " + readError(conn));
            }
            return JSONUtil.parseObj(readBody(conn.getInputStream()));
        } catch (ArkApiException e) {
            throw e;
        } catch (Exception e) {
            throw new ArkApiException(-1, "GET " + path + " 失败: " + e.getMessage());
        } finally {
            if (conn != null) {
                conn.disconnect();
            }
        }
    }

    private void delete(AgentProviderConfigService.ArkConfig cfg, String path) {
        HttpURLConnection conn = null;
        try {
            URL url = new URL(cfg.getBaseUrl() + path);
            conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("DELETE");
            conn.setRequestProperty("Authorization", "Bearer " + cfg.getApiKey());
            conn.setConnectTimeout(cfg.getConnectTimeoutMs());
            conn.setReadTimeout(cfg.getReadTimeoutMs());
            int status = conn.getResponseCode();
            if (status >= 300) {
                throw new ArkApiException(status, "DELETE " + path + " 失败 HTTP " + status + ": " + readError(conn));
            }
        } catch (ArkApiException e) {
            throw e;
        } catch (Exception e) {
            throw new ArkApiException(-1, "DELETE " + path + " 失败: " + e.getMessage());
        } finally {
            if (conn != null) {
                conn.disconnect();
            }
        }
    }

    private String readBody(InputStream is) throws Exception {
        StringBuilder sb = new StringBuilder();
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(is, StandardCharsets.UTF_8))) {
            String line;
            while ((line = reader.readLine()) != null) {
                sb.append(line);
            }
        }
        return sb.toString();
    }

    private String readError(HttpURLConnection conn) {
        try {
            InputStream err = conn.getErrorStream();
            return err == null ? "" : readBody(err);
        } catch (Exception e) {
            return "";
        }
    }

    /** 活动中的 SSE 流句柄：close 幂等，closed/readyLatch 供引擎探测状态 */
    public static final class StreamHandle {

        private final HttpURLConnection connection;
        private final Runnable onClosed;
        private final CountDownLatch ready = new CountDownLatch(1);
        private final AtomicBoolean closed = new AtomicBoolean(false);

        StreamHandle(HttpURLConnection connection, Runnable onClosed) {
            this.connection = connection;
            this.onClosed = onClosed;
        }

        CountDownLatch readyLatch() {
            return ready;
        }

        AtomicBoolean closed() {
            return closed;
        }

        public void close() {
            if (closed.compareAndSet(false, true)) {
                try {
                    connection.disconnect();
                } catch (Exception ignored) {
                    // 断连清理失败无需处理
                }
                if (onClosed != null) {
                    try {
                        onClosed.run();
                    } catch (Exception ignored) {
                        // 关闭回调异常不影响主流程
                    }
                }
            }
        }
    }
}
