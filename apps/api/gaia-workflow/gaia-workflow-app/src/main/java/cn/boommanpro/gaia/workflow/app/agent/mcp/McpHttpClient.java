package cn.boommanpro.gaia.workflow.app.agent.mcp;

import cn.hutool.json.JSONArray;
import cn.hutool.json.JSONObject;
import cn.hutool.json.JSONUtil;
import lombok.extern.slf4j.Slf4j;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicLong;

/**
 * MCP HTTP 客户端，两种协议共用：
 * <ul>
 *   <li><b>http</b>（Streamable HTTP，MCP 官方现行传输）：每个 JSON-RPC 一次 POST；
 *       响应可能是 application/json 或 text/event-stream（从事件流里取回本请求的响应）；
 *       initialize 响应头的 Mcp-Session-Id 会在后续请求回带。</li>
 *   <li><b>sse</b>（旧 HTTP+SSE）：GET 建立常驻事件流，从 endpoint 事件取到消息端点，
 *       请求 POST 到该端点（202），响应经事件流的 message 事件回来。</li>
 * </ul>
 * 对齐仓库惯例：原生 HttpURLConnection，不引第三方 SDK。
 */
@Slf4j
public class McpHttpClient implements McpTransportClient {

    private final String serverName;
    private final String url;
    private final Map<String, String> headers;
    private final boolean sseMode;
    private final AtomicLong idSeq = new AtomicLong();
    private final Map<Long, CompletableFuture<JSONObject>> pending = new ConcurrentHashMap<>();

    /** streamable http：initialize 返回的会话 id */
    private volatile String sessionId;
    /** sse：endpoint 事件给出的消息端点（可能是相对地址） */
    private volatile String messageEndpoint;
    private volatile HttpURLConnection sseConn;
    private volatile boolean closed;

    public McpHttpClient(String serverName, String url, Map<String, String> headers, boolean sseMode) {
        this.serverName = serverName;
        this.url = url;
        this.headers = headers == null ? Map.of() : headers;
        this.sseMode = sseMode;
    }

    /* ---------------- 传输层 ---------------- */

    private HttpURLConnection open(String target, String method) throws Exception {
        HttpURLConnection conn = (HttpURLConnection) new URL(target).openConnection();
        conn.setRequestMethod(method);
        conn.setConnectTimeout(15_000);
        headers.forEach(conn::setRequestProperty);
        return conn;
    }

    /** POST 一条 JSON-RPC 文本（仅通知类使用：无 id，不期待响应体）。sse 模式 POST 到消息端点（202）。 */
    private int post(String target, String body) throws Exception {
        HttpURLConnection conn = open(target, "POST");
        conn.setDoOutput(true);
        conn.setRequestProperty("Content-Type", "application/json");
        if (sessionId != null) {
            conn.setRequestProperty("Mcp-Session-Id", sessionId);
        }
        try (OutputStream os = conn.getOutputStream()) {
            os.write(body.getBytes(StandardCharsets.UTF_8));
        }
        int code = conn.getResponseCode();
        if (code >= 400) {
            String err = readAll(conn);
            conn.disconnect();
            throw new RuntimeException("MCP HTTP " + code + ": " + err);
        }
        String sid = conn.getHeaderField("Mcp-Session-Id");
        if (sid != null && !sid.isEmpty()) sessionId = sid;
        readAll(conn); // 读掉响应体（通知类一般 202 空体）
        conn.disconnect();
        return code;
    }

    private String resolveUrl(String endpoint) {
        if (endpoint.startsWith("http://") || endpoint.startsWith("https://")) return endpoint;
        try {
            URL base = new URL(url);
            return new URL(base, endpoint).toString();
        } catch (Exception e) {
            return endpoint;
        }
    }

    /* ---------------- JSON-RPC ---------------- */

    private JSONObject request(String method, JSONObject params, long timeoutMs) throws Exception {
        long id = idSeq.incrementAndGet();
        JSONObject req = new JSONObject().set("jsonrpc", "2.0").set("id", id).set("method", method);
        if (params != null) req.set("params", params);
        if (sseMode) {
            CompletableFuture<JSONObject> future = new CompletableFuture<>();
            pending.put(id, future);
            post(messageEndpoint, req.toString());
            JSONObject resp = future.get(timeoutMs, TimeUnit.MILLISECONDS);
            if (resp != null && resp.containsKey("error")) {
                throw new RuntimeException("MCP " + method + " 失败：" + resp.getJSONObject("error"));
            }
            return resp == null ? null : resp.getJSONObject("result");
        }
        // streamable：POST 响应即结果。把请求写出去并在事件流/JSON 体里匹配 id
        HttpURLConnection conn = open(url, "POST");
        conn.setDoOutput(true);
        conn.setReadTimeout((int) Math.min(timeoutMs, 120_000));
        conn.setRequestProperty("Content-Type", "application/json");
        conn.setRequestProperty("Accept", "application/json, text/event-stream");
        if (sessionId != null) conn.setRequestProperty("Mcp-Session-Id", sessionId);
        try (OutputStream os = conn.getOutputStream()) {
            os.write(req.toString().getBytes(StandardCharsets.UTF_8));
        }
        int code = conn.getResponseCode();
        if (code >= 400) {
            String err = readAll(conn);
            conn.disconnect();
            throw new RuntimeException("MCP HTTP " + code + ": " + err);
        }
        String sid = conn.getHeaderField("Mcp-Session-Id");
        if (sid != null && !sid.isEmpty()) sessionId = sid;
        String contentType = conn.getContentType() == null ? "" : conn.getContentType();
        JSONObject resp;
        if (contentType.contains("text/event-stream")) {
            resp = takeFromSse(conn, id);
        } else {
            String body = readAll(conn);
            conn.disconnect();
            resp = (body == null || body.trim().isEmpty()) ? null : JSONUtil.parseObj(body);
        }
        if (resp != null && resp.containsKey("error")) {
            throw new RuntimeException("MCP " + method + " 失败：" + resp.getJSONObject("error"));
        }
        return resp == null ? null : resp.getJSONObject("result");
    }

    /** streamable 事件流：读到与本请求 id 匹配的响应为止 */
    private JSONObject takeFromSse(HttpURLConnection conn, long expectId) throws Exception {
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(
            conn.getInputStream(), StandardCharsets.UTF_8))) {
            String event = null;
            StringBuilder data = new StringBuilder();
            String line;
            while ((line = reader.readLine()) != null) {
                if (line.isEmpty()) {
                    if (data.length() > 0 && ("message".equals(event) || event == null)) {
                        JSONObject resp = JSONUtil.parseObj(data.toString());
                        if (Long.valueOf(expectId).equals(resp.getLong("id"))) {
                            conn.disconnect();
                            return resp;
                        }
                    }
                    event = null;
                    data.setLength(0);
                } else if (line.startsWith("event:")) {
                    event = line.substring(6).trim();
                } else if (line.startsWith("data:")) {
                    data.append(line.substring(5).trim());
                }
            }
        } finally {
            conn.disconnect();
        }
        throw new RuntimeException("MCP 事件流结束前未取到响应 id=" + expectId);
    }

    private void notification(String method) throws Exception {
        JSONObject req = new JSONObject().set("jsonrpc", "2.0").set("method", method);
        post(sseMode ? messageEndpoint : url, req.toString());
    }

    private String readAll(HttpURLConnection conn) {
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(
            conn.getResponseCode() >= 400 ? conn.getErrorStream() : conn.getInputStream(), StandardCharsets.UTF_8))) {
            StringBuilder sb = new StringBuilder();
            String line;
            while ((line = reader.readLine()) != null) sb.append(line);
            return sb.toString();
        } catch (Exception e) {
            return "";
        }
    }

    /* ---------------- 生命周期 ---------------- */

    @Override
    public void initialize(long timeoutMs) throws Exception {
        if (sseMode) {
            openSseStream(timeoutMs);
        }
        JSONObject params = new JSONObject()
            .set("protocolVersion", "2025-06-18")
            .set("capabilities", new JSONObject())
            .set("clientInfo", new JSONObject().set("name", "gaia-workflow").set("version", "1.0.0"));
        JSONObject result = request("initialize", params, timeoutMs);
        if (result != null) {
            log.info("[mcp:{}:{}] initialized: server={} protocol={}", serverName, sseMode ? "sse" : "http",
                result.getJSONObject("serverInfo"), result.getStr("protocolVersion"));
        }
        notification("notifications/initialized");
    }

    /** 旧 SSE 协议：常驻 GET 事件流 + 等 endpoint 事件 */
    private void openSseStream(long timeoutMs) throws Exception {
        HttpURLConnection conn = open(url, "GET");
        conn.setRequestProperty("Accept", "text/event-stream");
        conn.setReadTimeout(0); // 常驻
        int code = conn.getResponseCode();
        if (code >= 400) {
            String err = readAll(conn);
            conn.disconnect();
            throw new RuntimeException("MCP SSE 连接失败 HTTP " + code + ": " + err);
        }
        this.sseConn = conn;
        CompletableFuture<String> endpointFuture = new CompletableFuture<>();
        Thread reader = new Thread(() -> {
            try (BufferedReader reader2 = new BufferedReader(new InputStreamReader(
                conn.getInputStream(), StandardCharsets.UTF_8))) {
                String event = null;
                StringBuilder data = new StringBuilder();
                String line;
                while (!closed && (line = reader2.readLine()) != null) {
                    if (line.isEmpty()) {
                        if (data.length() > 0) {
                            if ("endpoint".equals(event)) {
                                endpointFuture.complete(resolveUrl(data.toString().trim()));
                            } else if ("message".equals(event)) {
                                try {
                                    JSONObject resp = JSONUtil.parseObj(data.toString());
                                    Long id = resp.getLong("id");
                                    if (id != null) {
                                        CompletableFuture<JSONObject> f = pending.remove(id);
                                        if (f != null) f.complete(resp);
                                    }
                                } catch (Exception e) {
                                    log.warn("[mcp:{}:sse] 非 JSON 事件：{}", serverName, data.substring(0, Math.min(120, data.length())));
                                }
                            }
                        }
                        event = null;
                        data.setLength(0);
                    } else if (line.startsWith("event:")) {
                        event = line.substring(6).trim();
                    } else if (line.startsWith("data:")) {
                        data.append(line.substring(5).trim());
                    }
                }
            } catch (Exception ignored) {
                /* 连接关闭 */
            } finally {
                endpointFuture.completeExceptionally(new IllegalStateException("SSE 事件流已关闭"));
                pending.values().forEach(f -> f.completeExceptionally(new IllegalStateException("SSE 事件流已关闭")));
                pending.clear();
            }
        }, "mcp-sse-" + serverName);
        reader.setDaemon(true);
        reader.start();
        String endpoint = endpointFuture.get(timeoutMs, TimeUnit.MILLISECONDS);
        if (endpoint == null) throw new RuntimeException("SSE 流上未收到 endpoint 事件");
        this.messageEndpoint = endpoint;
    }

    @Override
    public List<McpToolDescriptor> listTools(long timeoutMs) throws Exception {
        List<McpToolDescriptor> tools = new ArrayList<>();
        String cursor = null;
        do {
            JSONObject params = cursor == null ? null : new JSONObject().set("cursor", cursor);
            JSONObject result = request("tools/list", params, timeoutMs);
            JSONArray arr = result == null ? null : result.getJSONArray("tools");
            if (arr != null) {
                for (Object o : arr) {
                    JSONObject tool = (JSONObject) o;
                    tools.add(new McpToolDescriptor(
                        tool.getStr("name"),
                        tool.getStr("description"),
                        tool.getJSONObject("inputSchema")));
                }
            }
            cursor = result == null ? null : result.getStr("nextCursor");
        } while (cursor != null && !cursor.isEmpty());
        return tools;
    }

    @Override
    public JSONObject callTool(String toolName, JSONObject arguments, long timeoutMs) throws Exception {
        JSONObject params = new JSONObject().set("name", toolName);
        if (arguments != null && !arguments.isEmpty()) {
            params.set("arguments", arguments);
        }
        return request("tools/call", params, timeoutMs);
    }

    @Override
    public void close() {
        closed = true;
        if (sseConn != null) sseConn.disconnect();
        pending.values().forEach(f -> f.completeExceptionally(new IllegalStateException("client closed")));
        pending.clear();
        // streamable：尽力通知服务端结束会话
        if (!sseMode && sessionId != null) {
            try {
                HttpURLConnection conn = open(url, "DELETE");
                conn.setRequestProperty("Mcp-Session-Id", sessionId);
                conn.getResponseCode();
                conn.disconnect();
            } catch (Exception ignored) {
                /* 服务端可能不支持 DELETE */
            }
        }
    }
}
