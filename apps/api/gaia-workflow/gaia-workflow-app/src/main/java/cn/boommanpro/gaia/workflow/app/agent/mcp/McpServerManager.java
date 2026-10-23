package cn.boommanpro.gaia.workflow.app.agent.mcp;

import cn.boommanpro.gaia.workflow.app.agent.tool.ToolExecutor;
import cn.boommanpro.gaia.workflow.app.agent.tool.ToolExecutorRegistry;
import cn.boommanpro.gaia.workflow.app.service.AgentToolRegistry;
import cn.boommanpro.gaia.workflow.infra.manage.entity.AgentMcpServer;
import cn.boommanpro.gaia.workflow.infra.manage.entity.AgentToolDefinition;
import cn.boommanpro.gaia.workflow.infra.manage.mapper.AgentToolDefinitionMapper;
import cn.boommanpro.gaia.workflow.infra.manage.service.AgentMcpServerService;
import cn.boommanpro.gaia.workflow.infra.manage.service.AgentToolDefinitionService;
import cn.hutool.json.JSONArray;
import cn.hutool.json.JSONObject;
import cn.hutool.json.JSONUtil;
import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import javax.annotation.PostConstruct;
import javax.annotation.PreDestroy;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

/**
 * MCP 服务器管理器：配置（agent_mcp_server）→ 连接 → 工具发现 → 工具目录同步 → 执行器注册。
 *
 * <p>同步策略：发现的工具 upsert 进 {@code agent_tool_definition}（tool_group='mcp'，
 * 名称 {@code mcp__<server>__<tool>}），只更新 schema/描述、<b>保留用户设置的 enabled</b>；
 * 服务器上已消失的工具物理删除。断开/出错只注销执行器——定义留在目录里但
 * buildToolkit 会因「执行器不存在」跳过，工具目录与管理页依然可见。</p>
 */
@Slf4j
@Component
public class McpServerManager {

    public static final String TOOL_PREFIX = "mcp__";
    public static final String TOOL_GROUP = "mcp";
    /** stdio 首连可能要 npx 拉包，给足时间 */
    private static final long INIT_TIMEOUT_MS = 90_000;
    private static final long LIST_TIMEOUT_MS = 30_000;
    private static final long CALL_TIMEOUT_MS = 120_000;
    /** 单个 content 项转给模型的最大字符数（截图 base64 等大结果截断，回传链路另有 60k 总量裁剪） */
    private static final int MAX_CONTENT_CHARS = 100_000;

    private final AgentMcpServerService serverService;
    private final AgentToolDefinitionService toolDefService;
    private final AgentToolDefinitionMapper toolDefMapper;
    private final ToolExecutorRegistry executorRegistry;
    private final AgentToolRegistry toolRegistry;

    /** 每服务器运行态（连接 + 状态 + 已注册执行器） */
    private static class State {
        volatile McpTransportClient client;
        volatile String status = "stopped";   // connected | error | stopped
        volatile String lastError;
        volatile int toolCount;
        final List<McpToolDescriptor> tools = new CopyOnWriteArrayList<>();
        final List<ToolExecutor> executors = new CopyOnWriteArrayList<>();
    }

    private final Map<String, State> states = new ConcurrentHashMap<>();

    public McpServerManager(AgentMcpServerService serverService,
                            AgentToolDefinitionService toolDefService,
                            AgentToolDefinitionMapper toolDefMapper,
                            ToolExecutorRegistry executorRegistry,
                            AgentToolRegistry toolRegistry) {
        this.serverService = serverService;
        this.toolDefService = toolDefService;
        this.toolDefMapper = toolDefMapper;
        this.executorRegistry = executorRegistry;
        this.toolRegistry = toolRegistry;
    }

    /* ---------------- 生命周期 ---------------- */

    /** 启动时异步连接所有 enabled 的服务器（不阻塞主流程；npx 拉包可能很慢） */
    @PostConstruct
    public void startup() {
        Thread boot = new Thread(() -> {
            try {
                List<AgentMcpServer> servers = serverService.list(new QueryWrapper<AgentMcpServer>()
                    .eq("enabled", 1));
                for (AgentMcpServer cfg : servers) {
                    try {
                        connect(cfg);
                    } catch (Exception e) {
                        log.warn("[mcp:{}] 启动连接失败：{}", cfg.getServerName(), e.getMessage());
                    }
                }
            } catch (Exception e) {
                log.warn("[mcp] 启动加载失败：{}", e.getMessage());
            }
        }, "mcp-startup");
        boot.setDaemon(true);
        boot.start();
    }

    @PreDestroy
    public void shutdown() {
        states.values().forEach(st -> {
            if (st.client != null) st.client.close();
        });
    }

    /* ---------------- 连接管理 ---------------- */

    public static String toolFullName(String serverName, String toolName) {
        return TOOL_PREFIX + serverName + "__" + toolName;
    }

    /** 连接（含工具发现、目录同步、执行器注册）；失败置 error 态并抛出原因 */
    public synchronized Map<String, Object> connect(AgentMcpServer cfg) {
        String name = cfg.getServerName();
        State st = states.computeIfAbsent(name, k -> new State());
        closeQuietly(st);
        st.status = "stopped";
        st.lastError = null;
        try {
            McpTransportClient client = buildClient(cfg);
            client.initialize(INIT_TIMEOUT_MS);
            List<McpToolDescriptor> tools = client.listTools(LIST_TIMEOUT_MS);

            st.tools.clear();
            st.tools.addAll(tools);

            syncToolDefinitions(name, tools);
            restoreEnabledSnapshot(cfg, tools);
            st.executors.clear();
            for (McpToolDescriptor tool : tools) {
                McpToolExecutor executor = new McpToolExecutor(toolFullName(name, tool.getName()), name, tool.getDescription(), this);
                executorRegistry.register(executor);
                st.executors.add(executor);
            }

            st.client = client;
            st.status = "connected";
            st.toolCount = tools.size();
            toolRegistry.refresh();
            log.info("[mcp:{}] connected · {} 个工具", name, tools.size());
            return statusOf(name, cfg);
        } catch (Exception e) {
            st.status = "error";
            st.lastError = e.getMessage();
            st.executors.forEach(ex -> executorRegistry.unregister(ex.name()));
            st.executors.clear();
            // 连接失败同样置关工具开关（快照恢复语义一致）：避免目录/提示词里出现不可用工具
            snapshotAndZero(cfg);
            log.warn("[mcp:{}] 连接失败：{}", name, e.getMessage());
            Map<String, Object> result = statusOf(name, cfg);
            result.put("ok", false);
            return result;
        }
    }

    /**
     * 断开：销毁连接并注销执行器，同时把该服务器的工具开关全部置关
     * （先快照启用中的工具到 agent_mcp_server.enabled_tools，重连按快照恢复）。
     * DB 的 enabled 是工具目录/提示词/注入三方的唯一事实源——全部置关后，
     * 模型侧（buildToolkit 与系统提示词目录）自动不再出现这些工具。
     */
    public synchronized Map<String, Object> disconnect(String serverName) {
        State st = states.get(serverName);
        if (st != null) {
            closeQuietly(st);
            st.status = "stopped";
            st.lastError = null;
        }
        AgentMcpServer cfg = findConfig(serverName);
        if (cfg != null) {
            snapshotAndZero(cfg);
        }
        return statusOf(serverName, cfg);
    }

    /** 快照当前启用中的工具并把其开关全部置关（断开/连接失败共用；DB 是目录/提示词/注入的唯一事实源） */
    private void snapshotAndZero(AgentMcpServer cfg) {
        String prefix = TOOL_PREFIX + cfg.getServerName() + "__";
        List<AgentToolDefinition> defs = toolDefService.list(new QueryWrapper<AgentToolDefinition>()
            .likeRight("tool_name", prefix));
        List<String> enabledNames = new ArrayList<>();
        String now = LocalDateTime.now().toString();
        for (AgentToolDefinition def : defs) {
            if (Integer.valueOf(1).equals(def.getEnabled())) {
                enabledNames.add(def.getToolName());
                def.setEnabled(0);
                def.setUpdatedAt(now);
                toolDefService.updateById(def);
            }
        }
        cfg.setEnabledTools(JSONUtil.toJsonStr(enabledNames));
        cfg.setUpdatedAt(now);
        serverService.updateById(cfg);
        if (!enabledNames.isEmpty()) {
            toolRegistry.refresh();
            log.info("[mcp:{}] 工具开关已置关 {} 个（快照保存，重连恢复）", cfg.getServerName(), enabledNames.size());
        }
    }

    /** 删除配置：断开 + 清理该服务器的全部工具定义 + 删行 */
    public synchronized void deleteServer(String serverName) {
        State st = states.remove(serverName);
        if (st != null) {
            closeQuietly(st);
        }
        String prefix = TOOL_PREFIX + serverName + "__";
        List<AgentToolDefinition> defs = toolDefService.list(new QueryWrapper<AgentToolDefinition>()
            .likeRight("tool_name", prefix));
        for (AgentToolDefinition def : defs) {
            toolDefMapper.physicalDeleteByName(def.getToolName());
        }
        if (!defs.isEmpty()) {
            toolRegistry.refresh();
        }
        AgentMcpServer cfg = findConfig(serverName);
        if (cfg != null) {
            serverService.removeById(cfg.getId());
        }
        log.info("[mcp:{}] 已删除（清理 {} 个工具定义）", serverName, defs.size());
    }

    private void closeQuietly(State st) {
        if (st.client != null) {
            try { st.client.close(); } catch (Exception ignored) { }
            st.client = null;
        }
        st.executors.forEach(ex -> executorRegistry.unregister(ex.name()));
        st.executors.clear();
    }

    private McpTransportClient buildClient(AgentMcpServer cfg) {
        String transport = cfg.getTransport() == null ? "stdio" : cfg.getTransport().trim().toLowerCase();
        switch (transport) {
            case "stdio": {
                List<String> args = parseStringList(cfg.getArgs());
                Map<String, String> env = parseStringMap(cfg.getEnv());
                try {
                    return new McpStdioClient(cfg.getServerName(), cfg.getCommand(), args, env);
                } catch (Exception e) {
                    throw new RuntimeException("启动进程失败：" + e.getMessage(), e);
                }
            }
            case "http":
                return new McpHttpClient(cfg.getServerName(), cfg.getUrl(), parseStringMap(cfg.getHeaders()), false);
            case "sse":
                return new McpHttpClient(cfg.getServerName(), cfg.getUrl(), parseStringMap(cfg.getHeaders()), true);
            default:
                throw new RuntimeException("不支持的传输类型：" + transport);
        }
    }

    /* ---------------- 工具目录同步 ---------------- */

    /**
     * 断开重连后的开关恢复：按 enabled_tools 快照把仍存在的工具恢复启用；
     * 不在快照里的（断开前就被手工停用）保持关闭。无快照（从未断开）则不动。
     * 恢复完清空快照。
     */
    private void restoreEnabledSnapshot(AgentMcpServer cfg, List<McpToolDescriptor> tools) {
        String raw = cfg.getEnabledTools();
        if (raw == null || raw.isBlank() || "null".equals(raw)) {
            return; // 从未断开过：沿用现状（首次接入默认启用）
        }
        List<String> snapshot = parseStringList(raw);
        String now = LocalDateTime.now().toString();
        int restored = 0;
        for (McpToolDescriptor tool : tools) {
            String fullName = toolFullName(cfg.getServerName(), tool.getName());
            if (!snapshot.contains(fullName)) continue;
            AgentToolDefinition def = toolDefService.getOne(new QueryWrapper<AgentToolDefinition>()
                .eq("tool_name", fullName).last("LIMIT 1"));
            if (def != null && !Integer.valueOf(1).equals(def.getEnabled())) {
                def.setEnabled(1);
                def.setUpdatedAt(now);
                toolDefService.updateById(def);
                restored++;
            }
        }
        cfg.setEnabledTools("[]");
        cfg.setUpdatedAt(now);
        serverService.updateById(cfg);
        if (restored > 0) {
            toolRegistry.refresh();
            log.info("[mcp:{}] 重连：按快照恢复 {} 个工具开关", cfg.getServerName(), restored);
        }
    }

    /**
     * upsert：只更新 description/parameters，保留用户设置的 enabled / sort_order；
     * 服务器上已消失的工具物理删除（软删行会占住 UNIQUE 索引）。
     */
    private void syncToolDefinitions(String serverName, List<McpToolDescriptor> tools) {
        String prefix = TOOL_PREFIX + serverName + "__";
        Set<String> liveNames = new HashSet<>();
        String now = LocalDateTime.now().toString();
        for (McpToolDescriptor tool : tools) {
            String fullName = toolFullName(serverName, tool.getName());
            liveNames.add(fullName);
            String schema = tool.getInputSchema() == null ? "{}" : tool.getInputSchema().toString();
            String desc = tool.getDescription() == null ? "" : tool.getDescription();

            AgentToolDefinition existing = toolDefService.getOne(new QueryWrapper<AgentToolDefinition>()
                .eq("tool_name", fullName).last("LIMIT 1"));
            if (existing != null) {
                existing.setDescription(desc);
                existing.setParameters(schema);
                existing.setUpdatedAt(now);
                toolDefService.updateById(existing);
                continue;
            }
            // 软删残留占住唯一索引 → 物理清掉再插
            AgentToolDefinition tombstone = toolDefMapper.selectAnyByName(fullName);
            if (tombstone != null) {
                toolDefMapper.physicalDeleteByName(fullName);
            }
            AgentToolDefinition def = new AgentToolDefinition();
            def.setToolName(fullName);
            def.setToolGroup(TOOL_GROUP);
            def.setDescription(desc);
            def.setParameters(schema);
            def.setEnabled(1);
            def.setSortOrder(900);
            def.setCreatedAt(now);
            def.setUpdatedAt(now);
            toolDefService.save(def);
        }
        // 清理下线工具
        List<AgentToolDefinition> stale = toolDefService.list(new QueryWrapper<AgentToolDefinition>()
            .likeRight("tool_name", prefix));
        for (AgentToolDefinition def : stale) {
            if (!liveNames.contains(def.getToolName())) {
                toolDefMapper.physicalDeleteByName(def.getToolName());
            }
        }
    }

    /* ---------------- 调用 ---------------- */

    public JSONObject callTool(String serverName, String toolName, JSONObject args) {
        State st = states.get(serverName);
        if (st == null || st.client == null || !"connected".equals(st.status)) {
            throw new RuntimeException("MCP 服务器未连接：" + serverName);
        }
        try {
            return st.client.callTool(toolName, args, CALL_TIMEOUT_MS);
        } catch (Exception e) {
            throw new RuntimeException("MCP 调用失败（" + serverName + "/" + toolName + "）：" + e.getMessage(), e);
        }
    }

    /**
     * MCP tools/call 结果 → 模型可读的 JSON 字符串。
     * text 内容尝试解析为 JSON；图片等二进制只保留元信息与截断的 base64（总量另有管道裁剪）。
     */
    public static String contentToPayload(JSONObject result) {
        if (result == null) return "{}";
        JSONArray content = result.getJSONArray("content");
        if (content == null || content.isEmpty()) {
            return result.toString();
        }
        List<Object> converted = new ArrayList<>();
        for (Object o : content) {
            if (!(o instanceof JSONObject)) continue;
            JSONObject item = (JSONObject) o;
            String type = item.getStr("type");
            if ("text".equals(type)) {
                String text = item.getStr("text", "");
                String trimmed = text.length() > MAX_CONTENT_CHARS
                    ? text.substring(0, MAX_CONTENT_CHARS) + "…(截断)" : text;
                try {
                    Object parsed = JSONUtil.parse(trimmed);
                    converted.add(parsed);
                } catch (Exception notJson) {
                    converted.add(trimmed);
                }
            } else if ("image".equals(type)) {
                String data = item.getStr("data", "");
                JSONObject meta = new JSONObject()
                    .set("type", "image")
                    .set("mimeType", item.getStr("mimeType", "image/png"))
                    .set("bytes", data.length() / 4 * 3);
                if (!data.isEmpty()) {
                    meta.set("dataBase64Head", data.substring(0, Math.min(256, data.length())) + "…");
                }
                converted.add(meta);
            } else if ("resource".equals(type)) {
                JSONObject res = item.getJSONObject("resource");
                converted.add(new JSONObject()
                    .set("type", "resource")
                    .set("uri", res == null ? null : res.getStr("uri"))
                    .set("mimeType", res == null ? null : res.getStr("mimeType"))
                    .set("text", res == null ? null : res.getStr("text")));
            } else {
                converted.add(item);
            }
        }
        if (converted.size() == 1) {
            Object only = converted.get(0);
            return only instanceof String ? new JSONObject().set("text", only).toString() : JSONUtil.toJsonStr(only);
        }
        return JSONUtil.toJsonStr(converted);
    }

    /* ---------------- 状态查询（API 数据源） ---------------- */

    public AgentMcpServer findConfig(String serverName) {
        return serverService.getOne(new QueryWrapper<AgentMcpServer>()
            .eq("server_name", serverName).last("LIMIT 1"));
    }

    public Map<String, Object> statusOf(String serverName, AgentMcpServer cfg) {
        State st = states.get(serverName);
        Map<String, Object> m = new HashMap<>();
        m.put("serverName", serverName);
        m.put("status", st == null ? "stopped" : st.status);
        m.put("lastError", st == null ? null : st.lastError);
        m.put("toolCount", st == null ? 0 : st.toolCount);
        if (cfg != null) {
            m.put("transport", cfg.getTransport());
            m.put("command", cfg.getCommand());
            m.put("args", parseStringList(cfg.getArgs()));
            m.put("env", parseStringMap(cfg.getEnv()));
            m.put("url", cfg.getUrl());
            m.put("headers", parseStringMap(cfg.getHeaders()));
            m.put("enabled", cfg.getEnabled() != null && cfg.getEnabled() == 1);
        }
        return m;
    }

    /** 该服务器发现到的工具（带目录里的启停状态，管理页数据源） */
    public List<Map<String, Object>> toolsOf(String serverName) {
        State st = states.get(serverName);
        List<Map<String, Object>> list = new ArrayList<>();
        if (st == null) return list;
        for (McpToolDescriptor tool : st.tools) {
            String fullName = toolFullName(serverName, tool.getName());
            Map<String, Object> m = new HashMap<>();
            m.put("name", tool.getName());
            m.put("fullName", fullName);
            m.put("description", tool.getDescription());
            m.put("inputSchema", tool.getInputSchema());
            AgentToolDefinition def = toolDefService.getOne(new QueryWrapper<AgentToolDefinition>()
                .eq("tool_name", fullName).last("LIMIT 1"));
            m.put("enabled", def == null || (def.getEnabled() != null && def.getEnabled() == 1));
            list.add(m);
        }
        return list;
    }

    /* ---------------- JSON 工具 ---------------- */

    public static List<String> parseStringList(String json) {
        try {
            JSONArray arr = JSONUtil.parseArray(json);
            List<String> list = new ArrayList<>();
            for (Object o : arr) list.add(String.valueOf(o));
            return list;
        } catch (Exception e) {
            return new ArrayList<>();
        }
    }

    public static Map<String, String> parseStringMap(String json) {
        Map<String, String> map = new HashMap<>();
        try {
            JSONObject obj = JSONUtil.parseObj(json);
            for (String key : obj.keySet()) {
                map.put(key, obj.getStr(key));
            }
        } catch (Exception ignored) {
            /* 空或非法配置 */
        }
        return map;
    }
}
