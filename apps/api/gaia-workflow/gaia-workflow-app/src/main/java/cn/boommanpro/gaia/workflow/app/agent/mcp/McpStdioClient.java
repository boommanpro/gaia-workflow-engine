package cn.boommanpro.gaia.workflow.app.agent.mcp;

import cn.hutool.json.JSONArray;
import cn.hutool.json.JSONObject;
import cn.hutool.json.JSONUtil;
import lombok.extern.slf4j.Slf4j;

import java.io.BufferedReader;
import java.io.BufferedWriter;
import java.io.InputStreamReader;
import java.io.OutputStreamWriter;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;

/**
 * MCP stdio 客户端：拉起本地进程，行分隔 JSON-RPC over stdin/stdout（MCP stdio 传输规范）。
 *
 * <p>生命周期由 {@link McpServerManager} 管理：close() 销毁进程并唤醒所有挂起调用。</p>
 */
@Slf4j
public class McpStdioClient implements McpTransportClient {

    private final String serverName;
    private final Process process;
    private final BufferedWriter stdin;
    private final AtomicLong idSeq = new AtomicLong();
    private final Map<Long, CompletableFuture<JSONObject>> pending = new ConcurrentHashMap<>();
    private volatile boolean closed;

    public McpStdioClient(String serverName, String command, List<String> args, Map<String, String> env) throws Exception {
        this.serverName = serverName;
        List<String> cmdline = new ArrayList<>();
        cmdline.add(command);
        if (args != null) cmdline.addAll(args);
        ProcessBuilder pb = new ProcessBuilder(cmdline);
        if (env != null && !env.isEmpty()) {
            pb.environment().putAll(env);
        }
        pb.redirectErrorStream(false);
        this.process = pb.start();
        this.stdin = new BufferedWriter(new OutputStreamWriter(process.getOutputStream(), StandardCharsets.UTF_8));

        Thread reader = new Thread(this::readLoop, "mcp-stdio-" + serverName);
        reader.setDaemon(true);
        reader.start();

        Thread errDrain = new Thread(() -> {
            try (BufferedReader err = new BufferedReader(new InputStreamReader(process.getErrorStream(), StandardCharsets.UTF_8))) {
                String line;
                while ((line = err.readLine()) != null) {
                    log.warn("[mcp:{}:stderr] {}", serverName, line);
                }
            } catch (Exception ignored) {
                /* 进程退出后流关闭 */
            }
        }, "mcp-stderr-" + serverName);
        errDrain.setDaemon(true);
        errDrain.start();
    }

    private void readLoop() {
        try (BufferedReader out = new BufferedReader(new InputStreamReader(process.getInputStream(), StandardCharsets.UTF_8))) {
            String line;
            while (!closed && (line = out.readLine()) != null) {
                line = line.trim();
                if (line.isEmpty()) continue;
                JSONObject msg;
                try {
                    msg = JSONUtil.parseObj(line);
                } catch (Exception e) {
                    log.warn("[mcp:{}:stdout] 非 JSON 行：{}", serverName, line.substring(0, Math.min(200, line.length())));
                    continue;
                }
                if (msg.containsKey("id") && (msg.containsKey("result") || msg.containsKey("error"))) {
                    CompletableFuture<JSONObject> f = pending.remove(msg.getLong("id"));
                    if (f != null) f.complete(msg);
                } else if (msg.containsKey("method")) {
                    // 服务端 → 客户端请求（sampling/roots 等）：统一以 MethodNotFound 婉拒，避免对端挂起
                    if (msg.containsKey("id")) {
                        JSONObject resp = new JSONObject()
                            .set("jsonrpc", "2.0")
                            .set("id", msg.get("id"))
                            .set("error", new JSONObject()
                                .set("code", -32601)
                                .set("message", "gaia mcp client does not support server requests"));
                        writeLine(resp.toString());
                    }
                    // 纯通知（日志等）忽略
                }
            }
        } catch (Exception ignored) {
            /* 进程退出后流关闭 */
        } finally {
            failAllPending("stdio 通道已关闭");
        }
    }

    private synchronized void writeLine(String json) throws Exception {
        if (closed) throw new IllegalStateException("client closed");
        stdin.write(json);
        stdin.write('\n');
        stdin.flush();
    }

    private JSONObject request(String method, JSONObject params, long timeoutMs) throws Exception {
        long id = idSeq.incrementAndGet();
        JSONObject req = new JSONObject().set("jsonrpc", "2.0").set("id", id).set("method", method);
        if (params != null) req.set("params", params);
        CompletableFuture<JSONObject> future = new CompletableFuture<>();
        pending.put(id, future);
        writeLine(req.toString());
        JSONObject resp = future.get(timeoutMs, java.util.concurrent.TimeUnit.MILLISECONDS);
        if (resp != null && resp.containsKey("error")) {
            throw new RuntimeException("MCP " + method + " 失败：" + resp.getJSONObject("error"));
        }
        return resp == null ? null : resp.getJSONObject("result");
    }

    private void notification(String method) throws Exception {
        JSONObject req = new JSONObject().set("jsonrpc", "2.0").set("method", method);
        writeLine(req.toString());
    }

    @Override
    public void initialize(long timeoutMs) throws Exception {
        JSONObject params = new JSONObject()
            .set("protocolVersion", "2025-06-18")
            .set("capabilities", new JSONObject())
            .set("clientInfo", new JSONObject().set("name", "gaia-workflow").set("version", "1.0.0"));
        JSONObject result = request("initialize", params, timeoutMs);
        if (result != null) {
            log.info("[mcp:{}] initialized: server={} protocol={}", serverName,
                result.getJSONObject("serverInfo"), result.getStr("protocolVersion"));
        }
        notification("notifications/initialized");
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
        if (closed) return;
        closed = true;
        failAllPending("client closed");
        try { stdin.close(); } catch (Exception ignored) { }
        process.destroy();
        try {
            if (!process.waitFor(2, java.util.concurrent.TimeUnit.SECONDS)) {
                process.destroyForcibly();
            }
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            process.destroyForcibly();
        }
    }

    private void failAllPending(String reason) {
        pending.values().forEach(f -> f.completeExceptionally(new IllegalStateException(reason)));
        pending.clear();
    }
}
