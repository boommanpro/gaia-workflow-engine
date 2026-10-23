package cn.boommanpro.gaia.workflow.app.controller.system;

import cn.boommanpro.gaia.workflow.app.agent.mcp.McpServerManager;
import cn.boommanpro.gaia.workflow.infra.manage.entity.AgentMcpServer;
import cn.boommanpro.gaia.workflow.infra.manage.service.AgentMcpServerService;
import cn.hutool.json.JSONObject;
import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import lombok.Data;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;

/**
 * MCP 服务器管理（Agent 配置中心 · 工具定义 Tab）。
 *
 * <p>配置存 {@code agent_mcp_server}（非必装能力）：save 支持 stdio(command/args/env)
 * 与远程(url/headers)；enabled 保存后立即连接并发现工具。工具启停沿用
 * {@code /api/agent/tool-definition/save}（同一份 agent_tool_definition 数据）。</p>
 */
@RestController
@RequestMapping("/api/agent/mcp-server")
public class AgentMcpServerController {

    private static final Pattern NAME_PATTERN = Pattern.compile("^[a-z0-9][a-z0-9-]{0,62}$");

    private final AgentMcpServerService serverService;
    private final McpServerManager manager;

    public AgentMcpServerController(AgentMcpServerService serverService, McpServerManager manager) {
        this.serverService = serverService;
        this.manager = manager;
    }

    /** 保存请求体（args 数组 / env、headers 对象，与 Claude Desktop 的 mcpServers 同构） */
    @Data
    public static class McpServerSaveInput {
        private String serverName;
        private String transport;          // stdio | sse | http
        private String command;
        private List<String> args;
        private Map<String, String> env;
        private String url;
        private Map<String, String> headers;
        private Boolean enabled;
    }

    @GetMapping("/list")
    public List<Map<String, Object>> list() {
        List<Map<String, Object>> result = new ArrayList<>();
        List<AgentMcpServer> servers = serverService.list(new QueryWrapper<AgentMcpServer>()
            .orderByDesc("id"));
        for (AgentMcpServer cfg : servers) {
            result.add(manager.statusOf(cfg.getServerName(), cfg));
        }
        return result;
    }

    @PostMapping("/save")
    public ResponseEntity<Map<String, Object>> save(@RequestBody McpServerSaveInput input) {
        String name = input.getServerName() == null ? "" : input.getServerName().trim();
        String transport = input.getTransport() == null ? "stdio" : input.getTransport().trim().toLowerCase();
        boolean enabled = input.getEnabled() == null || input.getEnabled();
        if (!NAME_PATTERN.matcher(name).matches()) {
            return ResponseEntity.badRequest().body(Map.of(
                "ok", false, "error", "服务器名称不合法（小写字母/数字/中划线，且以字母或数字开头）"));
        }
        if (!"stdio".equals(transport) && !"sse".equals(transport) && !"http".equals(transport)) {
            return ResponseEntity.badRequest().body(Map.of(
                "ok", false, "error", "传输类型仅支持 stdio / sse / http"));
        }
        if ("stdio".equals(transport) && (input.getCommand() == null || input.getCommand().trim().isEmpty())) {
            return ResponseEntity.badRequest().body(Map.of(
                "ok", false, "error", "stdio 传输需要填写启动命令"));
        }
        if (!"stdio".equals(transport) && (input.getUrl() == null || input.getUrl().trim().isEmpty())) {
            return ResponseEntity.badRequest().body(Map.of(
                "ok", false, "error", "远程传输需要填写服务器地址"));
        }

        AgentMcpServer existing = serverService.getOne(new QueryWrapper<AgentMcpServer>()
            .eq("server_name", name).last("LIMIT 1"));
        AgentMcpServer cfg = existing == null ? new AgentMcpServer() : existing;
        cfg.setServerName(name);
        cfg.setTransport(transport);
        cfg.setCommand("stdio".equals(transport) ? input.getCommand().trim() : null);
        cfg.setArgs(input.getArgs() == null ? null : cn.hutool.json.JSONUtil.toJsonStr(input.getArgs()));
        cfg.setEnv(input.getEnv() == null || input.getEnv().isEmpty() ? null : cn.hutool.json.JSONUtil.toJsonStr(input.getEnv()));
        cfg.setUrl("stdio".equals(transport) ? null : input.getUrl().trim());
        cfg.setHeaders(input.getHeaders() == null || input.getHeaders().isEmpty() ? null : cn.hutool.json.JSONUtil.toJsonStr(input.getHeaders()));
        cfg.setEnabled(enabled ? 1 : 0);
        String now = LocalDateTime.now().toString();
        cfg.setUpdatedAt(now);
        if (existing == null) {
            cfg.setCreatedAt(now);
            serverService.save(cfg);
        } else {
            serverService.updateById(cfg);
        }

        Map<String, Object> result;
        if (enabled) {
            result = manager.connect(cfg);
        } else {
            result = manager.disconnect(name);
        }
        result.put("ok", "connected".equals(result.get("status")));
        return ResponseEntity.ok(result);
    }

    @DeleteMapping("/{serverName}")
    public Map<String, Object> delete(@PathVariable String serverName) {
        manager.deleteServer(serverName);
        return Map.of("ok", true);
    }

    @PostMapping("/{serverName}/connect")
    public Map<String, Object> connect(@PathVariable String serverName) {
        AgentMcpServer cfg = manager.findConfig(serverName);
        if (cfg == null) {
            return Map.of("ok", false, "error", "服务器不存在");
        }
        if (cfg.getEnabled() == null || cfg.getEnabled() != 1) {
            cfg.setEnabled(1);
            cfg.setUpdatedAt(LocalDateTime.now().toString());
            serverService.updateById(cfg);
        }
        Map<String, Object> result = manager.connect(cfg);
        result.put("ok", "connected".equals(result.get("status")));
        return result;
    }

    @PostMapping("/{serverName}/disconnect")
    public Map<String, Object> disconnect(@PathVariable String serverName) {
        AgentMcpServer cfg = manager.findConfig(serverName);
        if (cfg != null && (cfg.getEnabled() == null || cfg.getEnabled() != 0)) {
            cfg.setEnabled(0);
            cfg.setUpdatedAt(LocalDateTime.now().toString());
            serverService.updateById(cfg);
        }
        return manager.disconnect(serverName);
    }

    /** 该服务器发现的工具（含参数 schema 与目录启停状态） */
    @GetMapping("/{serverName}/tools")
    public List<Map<String, Object>> tools(@PathVariable String serverName) {
        return manager.toolsOf(serverName);
    }

    /** 管理端试调用：参数取用户给的示例值执行，结果不进入任何会话 */
    @PostMapping("/{serverName}/call")
    public Map<String, Object> call(@PathVariable String serverName, @RequestBody JSONObject body) {
        String tool = body.getStr("tool");
        JSONObject args = body.getJSONObject("arguments");
        if (tool == null || tool.isEmpty()) {
            return Map.of("ok", false, "error", "缺少 tool");
        }
        try {
            JSONObject result = manager.callTool(serverName, tool, args == null ? new JSONObject() : args);
            return Map.of(
                "ok", !(result != null && result.getBool("isError", false)),
                "payload", McpServerManager.contentToPayload(result));
        } catch (Exception e) {
            return Map.of("ok", false, "error", e.getMessage());
        }
    }
}
