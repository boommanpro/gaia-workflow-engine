package cn.boommanpro.gaia.workflow.app.agent.mcp.server;

import cn.boommanpro.gaia.workflow.app.agent.ass.AssToolContextBridge;
import cn.boommanpro.gaia.workflow.app.agent.core.AgentDefinition;
import cn.boommanpro.gaia.workflow.app.agent.core.AgentRequest;
import cn.boommanpro.gaia.workflow.app.agent.core.AgentRunContext;
import cn.boommanpro.gaia.workflow.app.agent.core.ToolExecutionMode;
import cn.boommanpro.gaia.workflow.app.agent.session.SessionEventBus;
import cn.boommanpro.gaia.workflow.app.agent.tool.ToolExecutor;
import cn.boommanpro.gaia.workflow.app.agent.tool.ToolExecutorRegistry;
import cn.boommanpro.gaia.workflow.app.agent.tool.ToolResult;
import cn.boommanpro.gaia.workflow.app.service.AgentToolRegistry;
import cn.boommanpro.gaia.workflow.infra.manage.entity.AgentSession;
import cn.boommanpro.gaia.workflow.infra.manage.service.AgentSessionService;
import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
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
import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

/**
 * Gaia 工具的 MCP streamable-http 端点 —— 同一套工具链路的统一对外控制面。
 *
 * <p><b>路径即绑定</b>：{@code /mcp/gaia/{sessionKey}}，每个 Gaia 会话一个端点。
 * 两类调用方共用：</p>
 * <ul>
 *   <li>火山方舟托管 Agent 回连（数据面工具执行，live 上下文经
 *       {@link AssToolContextBridge} 桥接运行窗口）</li>
 *   <li>外部 coding agent（DeepSeek / Claude Code 等任意 MCP 客户端）：initialize
 *       时懒创建 engine=external_mcp 的会话，逐步调用 node/edge/get/run 等工具
 *       构建工作流草稿——每次工具调用都推 {@code tool_call}/{@code tool_result}/
 *       {@code document} 事件到 {@link SessionEventBus}，用户在 console 会话页
 *       （/chat/{sessionKey}）实时观看画布增量渲染，构建完成后由用户确认落版。</li>
 * </ul>
 *
 * <p><b>协议范围</b>（streamable-http，JSON 响应形态；Spring Boot 2 javax 栈手写，
 * 不引 jakarta 版 MCP SDK）：</p>
 * <ul>
 *   <li>{@code initialize} → 颁发 {@code Mcp-Session-Id}，懒创建外部会话，回观看引导</li>
 *   <li>{@code notifications/*}（无 id）→ 202 空体</li>
 *   <li>{@code tools/list} → 后端可执行工具（AgentToolRegistry 的 function schema → MCP inputSchema）</li>
 *   <li>{@code tools/call} → {@link ToolExecutorRegistry} 执行；live 上下文优先，
 *       否则构造挂总线 sink 的离线上下文（事件不丢弃）</li>
 *   <li>{@code ping} → 空结果；DELETE → 200（MCP 会话终止）；GET → 405（无服务端推送需求，
 *       实时渲染走 Gaia 自有 SSE）</li>
 * </ul>
 */
@Slf4j
@RestController
public class GaiaMcpServerController {

    private static final String SUPPORTED_PROTOCOL_VERSION = "2025-03-26";
    private static final String SERVER_NAME = "gaia-tools";
    private static final String SERVER_VERSION = "1.1.0";

    /** agent_session.engine 的外部驱动值：该会话的构建动作来自 MCP 客户端 */
    private static final String ENGINE_EXTERNAL_MCP = "external_mcp";

    private final ToolExecutorRegistry toolExecutorRegistry;
    private final AgentToolRegistry toolRegistry;
    private final AgentSessionService sessionService;
    private final SessionEventBus eventBus;

    public GaiaMcpServerController(ToolExecutorRegistry toolExecutorRegistry,
                                   AgentToolRegistry toolRegistry,
                                   AgentSessionService sessionService,
                                   SessionEventBus eventBus) {
        this.toolExecutorRegistry = toolExecutorRegistry;
        this.toolRegistry = toolRegistry;
        this.sessionService = sessionService;
        this.eventBus = eventBus;
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
                response.setHeader("Mcp-Session-Id", newSessionId);
                // 外部 coding agent 首次接入：懒创建 engine=external_mcp 的会话，
                // 让 console 会话列表能看到并实时观看；已存在（内置/托管）则直接复用
                ensureSession(sessionKey, params.getJSONObject("clientInfo"));
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
                        .set("instructions", instructions(sessionKey)));
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

    /** MCP 客户端可能用 GET 建立服务端推送流：实时渲染走 Gaia 自有 SSE（/api/agent/session/{key}/events），此处 405 */
    @GetMapping("/mcp/gaia/{sessionKey}")
    public void streamNotSupported(HttpServletResponse response) {
        response.setStatus(405);
    }

    /**
     * MCP 会话终止：外部客户端正常断开时收尾观看画面（快照置 done），
     * Gaia 会话与草稿保留，用户稍后仍可观看/落版。路由权威在 URL 路径，无服务端状态需要清理。
     */
    @DeleteMapping("/mcp/gaia/{sessionKey}")
    public void terminate(@PathVariable("sessionKey") String sessionKey) {
        JSONObject state = eventBus.getState(sessionKey);
        if ("running".equals(state.getStr("status"))) {
            eventBus.publish(sessionKey, "done", new JSONObject().set("reason", "mcp_session_closed"));
        }
    }

    // ---------------- 会话与引导 ----------------

    /** 会话不存在时懒创建（engine=external_mcp）；已存在则不动（内置/托管会话直接复用） */
    private void ensureSession(String sessionKey, JSONObject clientInfo) {
        AgentSession existing = sessionService.getOne(
            new QueryWrapper<AgentSession>().eq("session_key", sessionKey).last("LIMIT 1"));
        if (existing != null) {
            return;
        }
        String clientName = clientInfo != null ? clientInfo.getStr("name", "") : "";
        AgentSession session = new AgentSession();
        session.setSessionKey(sessionKey);
        session.setTitle(clientName == null || clientName.isEmpty()
            ? "外部构建" : "外部构建 · " + clientName);
        session.setScope("chat");
        session.setEngine(ENGINE_EXTERNAL_MCP);
        session.setPinned(0);
        session.setArchived(0);
        session.setCreatedAt(LocalDateTime.now());
        session.setUpdatedAt(LocalDateTime.now());
        sessionService.save(session);
        log.info("[gaia-mcp] session={} lazily created for external agent ({})", sessionKey, clientName);
    }

    /**
     * initialize 引导：观看方式 + 操作策略。策略性文字，不含字段表——
     * 节点契约一律经 get(target=knowledge) 机器查询（P-05 知识与策略分离）。
     */
    private String instructions(String sessionKey) {
        return "Gaia Workflow Engine 工具集：查询、编辑、执行可视化工作流。\n"
            + "- 实时观看：用户在 Gaia console 会话列表打开 /chat/" + sessionKey + "，"
            + "可实时看到你每次工具调用引起的画布增量渲染，也可在此回答你的 ask_user 提问。\n"
            + "- 构建策略：先用 get(target=knowledge, nodeType=...) 查节点契约与示例，再 node/edge 增量构建；"
            + "构建中随时用 get(target=canvas) 回看全图、用 run(target=workflow|node|tests) 试跑验证；"
            + "完成后告知用户在会话页确认「保存为版本」落版（你无落版权限）。\n"
            + "- 凭证/地址/字段不确定时先查询，不要猜。";
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
            // 离线（无引擎循环在跑）时本端点即驱动方：补 tool_call/tool_result 事件，
            // 让观看页的工具卡与内置 agent 运行同构；live 上下文的事件由引擎侧负责，不重复发
            boolean offline = AssToolContextBridge.activeContext(sessionKey) == null;
            String callId = "mcp-" + UUID.randomUUID().toString().substring(0, 8);
            if (offline) {
                // 快照不在 running（idle/上轮已结束）时重置为「外部构建」画面：
                // 观看页据此显示构建中状态，工具卡从空累积；running 中则继续追加
                JSONObject state = eventBus.getState(sessionKey);
                if (!"running".equals(state.getStr("status"))) {
                    eventBus.setState(sessionKey, new JSONObject()
                        .set("status", "running")
                        .set("phase", "tools")
                        .set("driver", ENGINE_EXTERNAL_MCP)
                        .set("toolCalls", new JSONArray())
                        .set("timeline", new JSONArray()));
                }
                eventBus.publish(sessionKey, "tool_call", new JSONObject()
                    .set("id", callId).set("name", name).set("args", args));
            }
            long started = System.currentTimeMillis();
            try {
                result = executor.get().execute(args, context);
            } catch (Exception e) {
                log.warn("[gaia-mcp] session={} 工具 {} 执行异常: {}", sessionKey, name, e.getMessage());
                result = ToolResult.fail("{\"error\":\"" + e.getMessage() + "\"}", "工具执行异常");
            }
            if (offline) {
                eventBus.publish(sessionKey, "tool_result", new JSONObject()
                    .set("toolCallId", callId)
                    .set("payload", result.getPayload() != null ? result.getPayload() : "")
                    .set("rejected", !result.isSuccess()));
            }
            log.info("[gaia-mcp] session={} 工具 {} 执行完成 (success={} cost={}ms)",
                sessionKey, name, result.isSuccess(), System.currentTimeMillis() - started);
        }
        JSONArray content = new JSONArray();
        content.add(new JSONObject().set("type", "text")
            .set("text", result.getPayload() != null ? result.getPayload() : ""));
        return new JSONObject()
            .set("content", content)
            .set("isError", !result.isSuccess());
    }

    /**
     * live 上下文优先（引擎运行窗口内，事件由引擎侧 sink 推送）；
     * 否则构造挂总线 sink 的离线上下文——工具内部 emit 的 document 等事件
     * 直连 {@link SessionEventBus}，外部驱动的每次草稿变更对观看页可见。
     */
    private AgentRunContext resolveContext(String sessionKey, String locale) {
        AgentRunContext live = AssToolContextBridge.activeContext(sessionKey);
        if (live != null) {
            return live;
        }
        AgentRequest request = new AgentRequest(sessionKey, null,
            locale != null && !locale.isEmpty() ? locale : "zh-CN", null,
            null, ToolExecutionMode.BACKEND, null, null);
        AgentRunContext context = new AgentRunContext(request,
            AgentDefinition.builder().id("gaia-mcp-detached").name("gaia-mcp-detached").build(),
            ToolExecutionMode.BACKEND);
        context.setSink(event -> {
            try {
                eventBus.publish(sessionKey, event.getType(),
                    event.getData() != null ? event.getData() : new JSONObject());
            } catch (Exception ignore) {
                // 事件输出失败不中断工具执行（AgentEventSink 契约）
            }
        });
        return context;
    }

    private JSONObject jsonRpcError(Object id, int code, String message) {
        return new JSONObject()
            .set("jsonrpc", "2.0")
            .set("id", id)
            .set("error", new JSONObject().set("code", code).set("message", message));
    }
}
