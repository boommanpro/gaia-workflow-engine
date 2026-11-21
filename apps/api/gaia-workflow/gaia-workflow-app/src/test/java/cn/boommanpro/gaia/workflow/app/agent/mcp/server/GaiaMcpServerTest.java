package cn.boommanpro.gaia.workflow.app.agent.mcp.server;

import cn.boommanpro.gaia.workflow.app.agent.core.AgentRunContext;
import cn.boommanpro.gaia.workflow.app.agent.session.SessionEventBus;
import cn.boommanpro.gaia.workflow.app.agent.tool.ToolExecutor;
import cn.boommanpro.gaia.workflow.app.agent.tool.ToolExecutorRegistry;
import cn.boommanpro.gaia.workflow.app.agent.tool.ToolResult;
import cn.boommanpro.gaia.workflow.app.service.AgentToolRegistry;
import cn.boommanpro.gaia.workflow.infra.manage.entity.AgentSession;
import cn.boommanpro.gaia.workflow.infra.manage.service.AgentSessionService;
import cn.hutool.json.JSONArray;
import cn.hutool.json.JSONObject;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.mock.web.MockHttpServletResponse;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Gaia MCP Server 回归：外部 coding agent 接入的三个契约——
 * ① initialize 懒创建 engine=external_mcp 会话（已存在则复用，不重复建）；
 * ② 离线 tools/call 作为驱动方补发 tool_call/tool_result 事件并重置外部构建快照
 *   （live 上下文时不重复发，引擎侧负责）；
 * ③ 离线上下文挂总线 sink——工具内部 emit 的 document 事件不丢弃。
 */
class GaiaMcpServerTest {

    private ToolExecutorRegistry toolExecutorRegistry;
    private AgentToolRegistry toolRegistry;
    private AgentSessionService sessionService;
    private SessionEventBus eventBus;
    private GaiaMcpServerController controller;

    @BeforeEach
    void setUp() {
        toolExecutorRegistry = mock(ToolExecutorRegistry.class);
        toolRegistry = mock(AgentToolRegistry.class);
        sessionService = mock(AgentSessionService.class);
        eventBus = mock(SessionEventBus.class);
        controller = new GaiaMcpServerController(toolExecutorRegistry, toolRegistry, sessionService, eventBus);
        // 无 live 上下文注册（AssToolContextBridge 为空）→ 离线路径，正是外部 agent 场景
    }

    private static final String BODY_INIT = "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"initialize\","
        + "\"params\":{\"protocolVersion\":\"2025-03-26\",\"clientInfo\":{\"name\":\"DeepSeek Coder\"}}}";
    private static final String BODY_CALL(String tool) {
        return "{\"jsonrpc\":\"2.0\",\"id\":2,\"method\":\"tools/call\","
            + "\"params\":{\"name\":\"" + tool + "\",\"arguments\":{\"target\":\"canvas\"}}}";
    }

    @Test
    @DisplayName("initialize 对不存在的会话懒创建 engine=external_mcp，instructions 带观看引导")
    void initializeLazilyCreatesExternalSession() {
        when(sessionService.getOne(any())).thenReturn(null);
        MockHttpServletResponse response = new MockHttpServletResponse();

        JSONObject result = (JSONObject) controller.handle("ext-deepseek-01", BODY_INIT, null, null, response);

        assertNotNull(response.getHeaderValue("Mcp-Session-Id"));
        ArgumentCaptor<AgentSession> captor = ArgumentCaptor.forClass(AgentSession.class);
        verify(sessionService).save(captor.capture());
        assertEquals("ext-deepseek-01", captor.getValue().getSessionKey());
        assertEquals("external_mcp", captor.getValue().getEngine());
        assertEquals("外部构建 · DeepSeek Coder", captor.getValue().getTitle());
        String instructions = result.getJSONObject("result").getStr("instructions");
        assertTrue(instructions.contains("ext-deepseek-01"), "观看引导应包含 sessionKey");
        assertTrue(instructions.contains("/chat/ext-deepseek-01"), "观看引导应包含会话页路径");
        assertTrue(instructions.contains("get(target=knowledge"), "操作策略应引导先查契约（P-05：不复制字段表）");
    }

    @Test
    @DisplayName("initialize 对已存在会话直接复用，不重复创建")
    void initializeReusesExistingSession() {
        when(sessionService.getOne(any())).thenReturn(new AgentSession());
        MockHttpServletResponse response = new MockHttpServletResponse();

        controller.handle("existing-key", BODY_INIT, null, null, response);

        verify(sessionService, never()).save(any(AgentSession.class));
    }

    @Test
    @DisplayName("离线 tools/call 补发 tool_call/tool_result 事件并重置外部构建快照")
    void offlineCallEmitsDriverEvents() {
        ToolExecutor executor = mock(ToolExecutor.class);
        when(executor.canRunOnBackend()).thenReturn(true);
        when(executor.execute(any(), any(AgentRunContext.class)))
            .thenReturn(ToolResult.ok("{\"ok\":true}"));
        when(toolExecutorRegistry.get("get")).thenReturn(Optional.of(executor));
        when(eventBus.getState("ext-1")).thenReturn(new JSONObject().set("status", "idle"));

        JSONObject result = (JSONObject) controller.handle("ext-1", BODY_CALL("get"), null, null, new MockHttpServletResponse());

        assertTrue(!result.getJSONObject("result").getBool("isError", true));
        // 快照重置为外部构建画面
        ArgumentCaptor<JSONObject> state = ArgumentCaptor.forClass(JSONObject.class);
        verify(eventBus).setState(eq("ext-1"), state.capture());
        assertEquals("running", state.getValue().getStr("status"));
        assertEquals("external_mcp", state.getValue().getStr("driver"));
        // 驱动方事件：tool_call（含名字与参数）+ tool_result（成功回填）
        verify(eventBus).publish(eq("ext-1"), eq("tool_call"), any(JSONObject.class));
        verify(eventBus).publish(eq("ext-1"), eq("tool_result"), any(JSONObject.class));
    }

    @Test
    @DisplayName("快照已在 running 时不重置（继续累积工具卡）")
    void runningSnapshotNotReset() {
        ToolExecutor executor = mock(ToolExecutor.class);
        when(executor.canRunOnBackend()).thenReturn(true);
        when(executor.execute(any(), any(AgentRunContext.class))).thenReturn(ToolResult.ok("{}"));
        when(toolExecutorRegistry.get("get")).thenReturn(Optional.of(executor));
        when(eventBus.getState("ext-1")).thenReturn(new JSONObject().set("status", "running"));

        controller.handle("ext-1", BODY_CALL("get"), null, null, new MockHttpServletResponse());

        verify(eventBus, never()).setState(anyString(), any(JSONObject.class));
    }

    @Test
    @DisplayName("离线上下文挂总线 sink——工具内部 emit 的 document 事件直连 SessionEventBus")
    void offlineContextCarriesBusSink() {
        ToolExecutor executor = mock(ToolExecutor.class);
        when(executor.canRunOnBackend()).thenReturn(true);
        when(executor.execute(any(), any(AgentRunContext.class)))
            .thenAnswer(inv -> {
                // 模拟 node/edge 工具内部：draftService.emitDocument(ctx, key) 最终走 ctx.emit
                AgentRunContext ctx = inv.getArgument(1);
                ctx.emit("document", new JSONObject().set("version", 1).set("ops", new JSONArray()));
                return ToolResult.ok("{}");
            });
        when(toolExecutorRegistry.get("node")).thenReturn(Optional.of(executor));
        when(eventBus.getState("ext-1")).thenReturn(new JSONObject().set("status", "idle"));

        controller.handle("ext-1", BODY_CALL("node"), null, null, new MockHttpServletResponse());

        verify(eventBus).publish(eq("ext-1"), eq("document"), any(JSONObject.class));
    }

    @Test
    @DisplayName("DELETE 终止 MCP 会话时对 running 快照发 done 收尾观看画面")
    void terminateClosesRunningSnapshot() {
        when(eventBus.getState("ext-1")).thenReturn(new JSONObject().set("status", "running"));

        controller.terminate("ext-1");

        verify(eventBus).publish(eq("ext-1"), eq("done"), any(JSONObject.class));
    }

    @Test
    @DisplayName("未知方法返回 JSON-RPC Method not found")
    void unknownMethodRejected() {
        MockHttpServletResponse response = new MockHttpServletResponse();
        JSONObject result = (JSONObject) controller.handle("ext-1",
            "{\"jsonrpc\":\"2.0\",\"id\":3,\"method\":\"resources/list\"}", null, null, response);

        assertEquals(-32601, result.getJSONObject("error").getInt("code"));
    }
}
