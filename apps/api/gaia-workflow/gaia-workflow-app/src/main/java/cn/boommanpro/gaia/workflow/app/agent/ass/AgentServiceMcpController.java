package cn.boommanpro.gaia.workflow.app.agent.ass;

import cn.boommanpro.gaia.workflow.app.agent.core.AgentDefinition;
import cn.boommanpro.gaia.workflow.app.agent.core.AgentRegistry;
import cn.boommanpro.gaia.workflow.app.agent.core.AgentRequest;
import cn.boommanpro.gaia.workflow.app.agent.core.AgentRunContext;
import cn.boommanpro.gaia.workflow.app.agent.core.ToolExecutionMode;
import cn.boommanpro.gaia.workflow.app.agent.tool.ToolExecutor;
import cn.boommanpro.gaia.workflow.app.agent.tool.ToolExecutorRegistry;
import cn.boommanpro.gaia.workflow.app.agent.tool.ToolResult;
import cn.boommanpro.gaia.workflow.app.service.AgentToolRegistry;
import cn.hutool.json.JSONArray;
import cn.hutool.json.JSONObject;
import cn.hutool.json.JSONUtil;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import javax.servlet.http.HttpServletResponse;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;

/**
 * Gaia 工具的 MCP streamable-http 端点 —— 让 AgentScope Service 的托管 Agent 通过
 * 标准 MCP 协议回连本服务执行工具（对标 ark 引擎的 Custom Tool 回传，但走 MCP 正路）。
 *
 * <p><b>路径即绑定</b>：{@code /mcp/gaia/{sessionKey}}，每个 Gaia 会话一个端点。
 * 托管 Agent 的定义（由 {@link AgentServiceProvisioningService} 按会话生成）里
 * MCP URL 已带会话键，数据面每次工具调用天然路由回正确的本地会话。</p>
 *
 * <p><b>协议范围</b>（streamable-http，JSON 响应形态；Spring Boot 2 javax 栈手写，
 * 不引 jakarta 版 MCP SDK）：</p>
 * <ul>
 *   <li>{@code initialize} → 颁发 {@code Mcp-Session-Id}，回协议版本/能力/服务信息</li>
 *   <li>{@code notifications/*}（无 id）→ 202 空体</li>
 *   <li>{@code tools/list} → 后端可执行工具（AgentToolRegistry 的 function schema → MCP inputSchema）</li>
 *   <li>{@code tools/call} → {@link ToolExecutorRegistry} 执行，context 取
 *       {@link AssToolContextBridge}（live）或按会话构造离线上下文</li>
 *   <li>{@code ping} → 空结果；DELETE → 200（会话终止）；GET → 405（无服务端推送需求）</li>
 * </ul>
 */
@Slf4j
@RestController
public class AgentServiceMcpController {

    private static final String SUPPORTED_PROTOCOL_VERSION = "2025-03-26";
    private static final String SERVER_NAME = "gaia-tools";
    private static final String SERVER_VERSION = "1.0.0";

    private final ToolExecutorRegistry toolExecutorRegistry;
    private final AgentToolRegistry toolRegistry;
    private final AgentRegistry agentRegistry;

    /** MCP 会话 → 归属 Gaia 会话键（观测用；路由权威在 URL 路径） */
    private final ConcurrentMap<String, String> mcpSessions = new ConcurrentHashMap<>();

    public AgentServiceMcpController(ToolExecutorRegistry toolExecutorRegistry,
                                     AgentToolRegistry toolRegistry,
                                     AgentRegistry agentRegistry) {
        this.toolExecutorRegistry = toolExecutorRegistry;
        this.toolRegistry = toolRegistry;
        this.agentRegistry = agentRegistry;
    }

    @PostMapping("/mcp/gaia/{sessionKey}")
    public Object handle(@PathVariable("sessionKey") String sessionKey,
                         @RequestBody(required = false) String rawBody,
                         @RequestHeader(value = "Mcp-Session-Id", required = false) String mcpSessionId,
                         @RequestParam(value = "locale", required = false) String locale,
                         HttpServletResponse response) {
        JSONObject request;
        try {
            request = rawBody == null || rawBody.isEmpty() ? new JSONObject() : JSONUtil.parseObj(rawBody);
        } catch (Exception e) {
            response.setStatus(400);
            return jsonRpcError(null, -32700, "Parse error");
        }
        String method = request.getStr("method", "");
        Object id = request.get("id");
        boolean isNotification = id == null;
        JSONObject params = request.getJSONObject("params");
        if (params == null) {
            params = new JSONObject();
        }

        switch (method) {
            case "initialize": {
                String newSessionId = mcpSessionId != null && !mcpSessionId.isEmpty()
                    ? mcpSessionId : UUID.randomUUID().toString();
                mcpSessions.put(newSessionId, sessionKey);
                response.setHeader("Mcp-Session-Id", newSessionId);
                // 协议版本是字符串；客户端请求的版本受支持则回显，否则回服务端支持的版本
                String requested = params.getStr("protocolVersion");
                String protocolVersion = requested != null && !requested.isEmpty()
                    ? requested : SUPPORTED_PROTOCOL_VERSION;
                return new JSONObject()
                    .set("jsonrpc", "2.0")
                    .set("id", id)
                    .set("result", new JSONObject()
                        .set("protocolVersion", protocolVersion)
                        .set("capabilities", new JSONObject().set("tools", new JSONObject().set("listChanged", false)))
                        .set("serverInfo", new JSONObject().set("name", SERVER_NAME).set("version", SERVER_VERSION))
                        .set("instructions", "Gaia Workflow Engine 工具集：查询、编辑、执行与落版可视化工作流。"));
            }
            case "tools/list": {
                return new JSONObject()
                    .set("jsonrpc", "2.0")
                    .set("id", id)
                    .set("result", new JSONObject().set("tools", toolsSchema()));
            }
            case "tools/call": {
                return new JSONObject()
                    .set("jsonrpc", "2.0")
                    .set("id", id)
                    .set("result", callTool(sessionKey, locale, params));
            }
            case "ping": {
                return new JSONObject()
                    .set("jsonrpc", "2.0")
                    .set("id", id)
                    .set("result", new JSONObject());
            }
            default: {
                if (isNotification) {
                    // notifications/initialized 等：空体 202
                    response.setStatus(202);
                    return null;
                }
                return jsonRpcError(id, -32601, "Method not found: " + method);
            }
        }
    }

    /** MCP 客户端可能用 GET 建立服务端推送流：本端点无推送需求，明确拒绝 */
    @GetMapping("/mcp/gaia/{sessionKey}")
    public void streamNotSupported(HttpServletResponse response) {
        response.setStatus(405);
    }

    /** 会话终止 */
    @DeleteMapping("/mcp/gaia/{sessionKey}")
    public void terminate(@PathVariable("sessionKey") String sessionKey,
                          @RequestHeader(value = "Mcp-Session-Id", required = false) String mcpSessionId) {
        if (mcpSessionId != null) {
            mcpSessions.remove(mcpSessionId);
        }
    }

    // ---------------- 工具清单与执行 ----------------

    /** AgentToolRegistry 的 OpenAI function schema → MCP tool {name, description, inputSchema} */
    private JSONArray toolsSchema() {
        JSONArray tools = new JSONArray();
        JSONArray allSchemas = toolRegistry.getToolsSchema();
        for (int i = 0; i < allSchemas.size(); i++) {
            JSONObject tool = allSchemas.getJSONObject(i);
            JSONObject function = tool.getJSONObject("function");
            if (function == null) {
                continue;
            }
            String name = function.getStr("name");
            if (!toolExecutorRegistry.isBackendExecutable(name)) {
                continue;
            }
            Object parameters = function.get("parameters");
            tools.add(new JSONObject()
                .set("name", name)
                .set("description", function.getStr("description", "工具 " + name))
                .set("inputSchema", parameters != null ? parameters : new JSONObject().set("type", "object")));
        }
        return tools;
    }

    private JSONObject callTool(String sessionKey, String locale, JSONObject params) {
        String name = params.getStr("name", "");
        JSONObject args = params.getJSONObject("arguments");
        if (args == null) {
            args = new JSONObject();
        }
        Optional<ToolExecutor> executor = toolExecutorRegistry.get(name);
        ToolResult result;
        if (!executor.isPresent() || !executor.get().canRunOnBackend()) {
            result = ToolResult.unavailable("工具 " + name + " 不可用或需要浏览器界面");
        } else {
            AgentRunContext context = resolveContext(sessionKey, locale);
            long started = System.currentTimeMillis();
            try {
                result = executor.get().execute(args, context);
            } catch (Exception e) {
                log.warn("[ass-mcp] session={} 工具 {} 执行异常: {}", sessionKey, name, e.getMessage());
                result = ToolResult.fail("{\"error\":\"" + e.getMessage() + "\"}", "工具执行异常");
            }
            log.info("[ass-mcp] session={} 工具 {} 执行完成 (success={} cost={}ms)",
                sessionKey, name, result.isSuccess(), System.currentTimeMillis() - started);
        }
        JSONArray content = new JSONArray();
        content.add(new JSONObject().set("type", "text")
            .set("text", result.getPayload() != null ? result.getPayload() : ""));
        return new JSONObject()
            .set("content", content)
            .set("isError", !result.isSuccess());
    }

    /** live 上下文优先（事件可推前端），否则构造离线上下文 */
    private AgentRunContext resolveContext(String sessionKey, String locale) {
        AgentRunContext live = AssToolContextBridge.activeContext(sessionKey);
        if (live != null) {
            return live;
        }
        AgentRequest request = new AgentRequest(sessionKey, null,
            locale != null && !locale.isEmpty() ? locale : "zh-CN", null,
            null, ToolExecutionMode.BACKEND, null, null);
        AgentDefinition definition = null;
        try {
            definition = agentRegistry.get("as-service-assistant")
                .map(agent -> agent.getDefinition())
                .orElse(null);
        } catch (Exception ignore) {
            // 注册表不可用时构造空定义；工具执行不依赖 definition 主体
        }
        if (definition == null) {
            definition = AgentDefinition.builder().id("as-service-detached").name("as-service-detached").build();
        }
        return new AgentRunContext(request, definition, ToolExecutionMode.BACKEND);
    }

    private JSONObject jsonRpcError(Object id, int code, String message) {
        return new JSONObject()
            .set("jsonrpc", "2.0")
            .set("id", id)
            .set("error", new JSONObject().set("code", code).set("message", message));
    }
}
