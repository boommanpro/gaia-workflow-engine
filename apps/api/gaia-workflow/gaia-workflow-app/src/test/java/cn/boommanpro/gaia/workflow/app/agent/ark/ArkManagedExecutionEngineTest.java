package cn.boommanpro.gaia.workflow.app.agent.ark;

import cn.boommanpro.gaia.workflow.app.agent.core.AgentDefinition;
import cn.boommanpro.gaia.workflow.app.agent.core.AgentRegistry;
import cn.boommanpro.gaia.workflow.app.agent.core.AgentRequest;
import cn.boommanpro.gaia.workflow.app.agent.core.AgentRunResult;
import cn.boommanpro.gaia.workflow.app.agent.core.ConversationStore;
import cn.boommanpro.gaia.workflow.app.agent.core.DefinitionBasedAgent;
import cn.boommanpro.gaia.workflow.app.agent.core.ToolExecutionMode;
import cn.boommanpro.gaia.workflow.app.agent.event.AgentEventSink;
import cn.boommanpro.gaia.workflow.app.agent.llm.LlmMessage;
import cn.boommanpro.gaia.workflow.app.agent.tool.ToolExecutor;
import cn.boommanpro.gaia.workflow.app.agent.tool.ToolExecutorRegistry;
import cn.boommanpro.gaia.workflow.app.agent.tool.ToolResult;
import cn.boommanpro.gaia.workflow.app.config.AgentProperties;
import cn.boommanpro.gaia.workflow.app.service.AgentModelConfigService;
import cn.boommanpro.gaia.workflow.app.service.AgentProviderConfigService;
import cn.boommanpro.gaia.workflow.infra.manage.entity.AgentSession;
import cn.boommanpro.gaia.workflow.infra.manage.service.AgentConfigService;
import cn.hutool.json.JSONArray;
import cn.hutool.json.JSONObject;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.atomic.AtomicReference;
import java.util.function.Consumer;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

@DisplayName("ArkManagedExecutionEngine：fake 方舟客户端下的引擎行为")
class ArkManagedExecutionEngineTest {

    private FakeArkClient client;
    private InMemoryConversationStore conversationStore;
    private RecordingArkSessionService arkSessionService;
    private ArkManagedExecutionEngine engine;
    private AgentRegistry agentRegistry;

    @BeforeEach
    void setUp() {
        client = new FakeArkClient();
        conversationStore = new InMemoryConversationStore();
        arkSessionService = new RecordingArkSessionService();
        agentRegistry = new AgentRegistry();

        Set<String> tools = new LinkedHashSet<>();
        tools.add("query");
        AgentDefinition definition = AgentDefinition.builder()
            .id("ark-test")
            .name("方舟测试")
            .engine("ark")
            .arkAgentId("agent-fake-1")
            .toolNames(tools)
            .executionMode(ToolExecutionMode.BACKEND)
            .source("test")
            .build();
        agentRegistry.register(new DefinitionBasedAgent(definition));

        ToolExecutorRegistry toolExecutorRegistry = new ToolExecutorRegistry();
        toolExecutorRegistry.register(new ToolExecutor() {
            @Override
            public String name() {
                return "query";
            }

            @Override
            public ToolResult execute(JSONObject args, cn.boommanpro.gaia.workflow.app.agent.core.AgentRunContext context) {
                return ToolResult.ok("{\"result\":\"ok\",\"action\":\"" + args.getStr("action", "") + "\"}");
            }
        });

        client.onSendEvents = events -> accepted(events);

        // 手动绑定语义与真实实现一致（arkAgentId 非空）；绑定的定义不应触发 provisioning
        ArkAgentProvisioningService provisioning = new ArkAgentProvisioningService(
            null, null, null, null, null, null) {
            @Override
            public boolean isManuallyBound(AgentDefinition definition) {
                return definition.getArkAgentId() != null && !definition.getArkAgentId().isEmpty();
            }

            @Override
            public ProvisionedAgent ensureProvisioned(AgentDefinition definition) {
                throw new AssertionError("已手动绑定的定义不应触发自动同步");
            }
        };

        engine = new ArkManagedExecutionEngine(
            agentRegistry,
            client,
            fakeProviderConfig(),
            arkSessionService,
            provisioning,
            toolExecutorWithQuery(),
            conversationStore);
    }

    // ---------------- 测试用例 ----------------

    @Test
    @DisplayName("纯对话：user.message → agent.message 流 → end_turn 收尾并镜像落库")
    void plainConversation() {
        client.onSendEvents = (events) -> {
            if (isUserMessage(events)) {
                client.emit(statusRunning());
                client.emit(message("你好，我是方舟助手"));
                client.emit(usage(100, 10));
                client.emit(idleEndTurn());
            }
            return accepted(events);
        };

        AgentRunResult result = engine.run(request(), AgentEventSink.noop());

        assertFalse(result.isError());
        assertEquals("你好，我是方舟助手", result.getContent());
        assertEquals("sesn-fake-1", result.getSessionKey() != null ? arkSessionService.remoteSessionId : null);
        assertEquals(1, result.getTurns());
        assertEquals(1, conversationStore.messages.size());
        assertEquals("assistant", conversationStore.messages.get(0).getRole());
        assertEquals("你好，我是方舟助手", conversationStore.messages.get(0).getContent());
        // 用量已落库
        assertEquals(100L, arkSessionService.recordedUsage.getLong("input_tokens").longValue());
        // 首次运行创建了远端 Session
        assertEquals("sesn-fake-1", arkSessionService.remoteSessionId);
    }

    @Test
    @DisplayName("自定义工具：custom_tool_use → 本地执行 → custom_tool_result 回传后继续")
    void customToolRoundTrip() throws Exception {
        client.onSendEvents = (events) -> {
            String type = firstType(events);
            if (isUserMessage(events)) {
                client.emit(statusRunning());
                client.emit(customToolUse("sevt-tool-1", "query", "{\"action\":\"listWorkflows\"}"));
                client.emit(idleRequiresAction("sevt-tool-1"));
            } else if ("user.custom_tool_result".equals(type)) {
                client.sentToolResults.add(events.getJSONObject(0));
                client.emit(toolResult("sevt-tool-1"));
                client.emit(idleEndTurn());
            }
            return accepted(events);
        };

        AgentRunResult result = engine.run(request(), AgentEventSink.noop());
        // 工具在 toolPool 异步执行，等结果落库（最多 5s）
        awaitTrue(() -> conversationStore.hasToolMessage("sevt-tool-1"), 5000);

        assertFalse(result.isError());
        assertTrue(result.getExecutedTools().contains("query"));
        assertEquals(1, client.sentToolResults.size());
        JSONObject sentResult = client.sentToolResults.get(0);
        assertEquals("sevt-tool-1", sentResult.getStr("custom_tool_use_id"));
        assertFalse(sentResult.getBool("is_error", true));
        assertTrue(sentResult.getJSONArray("content").getJSONObject(0).getStr("text").contains("\"result\":\"ok\""));
        assertTrue(conversationStore.hasToolMessage("sevt-tool-1"));
    }

    @Test
    @DisplayName("不可用工具：无执行器 → 不执行，回传 is_error=true 的结果")
    void unavailableTool() throws Exception {
        ArkAgentProvisioningService provisioning = new ArkAgentProvisioningService(
            null, null, null, null, null, null) {
            @Override
            public boolean isManuallyBound(AgentDefinition definition) {
                return definition.getArkAgentId() != null && !definition.getArkAgentId().isEmpty();
            }
        };
        engine = new ArkManagedExecutionEngine(
            agentRegistry, client, fakeProviderConfig(), arkSessionService, provisioning,
            emptyToolExecutorRegistry(), conversationStore);

        client.onSendEvents = (events) -> {
            String type = firstType(events);
            if (isUserMessage(events)) {
                client.emit(statusRunning());
                client.emit(customToolUse("sevt-tool-2", "query", "{}"));
                client.emit(idleRequiresAction("sevt-tool-2"));
            } else if ("user.custom_tool_result".equals(type)) {
                client.sentToolResults.add(events.getJSONObject(0));
                client.emit(idleEndTurn());
            }
            return accepted(events);
        };

        engine.run(request(), AgentEventSink.noop());
        awaitTrue(() -> client.sentToolResults.size() == 1, 5000);

        JSONObject sentResult = client.sentToolResults.get(0);
        assertTrue(sentResult.getBool("is_error", false));
        assertTrue(conversationStore.hasToolMessage("sevt-tool-2"));
    }

    @Test
    @DisplayName("未绑定定义的自动同步失败 → 快速失败并广播 error")
    void provisioningFailureFails() {
        AgentDefinition unbound = AgentDefinition.builder()
            .id("ark-unbound").name("未绑定").engine("ark").source("test").build();
        agentRegistry.register(new DefinitionBasedAgent(unbound));

        ArkAgentProvisioningService failingProvisioning = new ArkAgentProvisioningService(
            null, null, null, null, null, null) {
            @Override
            public boolean isManuallyBound(AgentDefinition definition) {
                return false;
            }

            @Override
            public ProvisionedAgent ensureProvisioned(AgentDefinition definition) {
                throw new IllegalStateException("方舟连接失败（模拟）");
            }
        };
        ArkManagedExecutionEngine failingEngine = new ArkManagedExecutionEngine(
            agentRegistry, client, fakeProviderConfig(), arkSessionService, failingProvisioning,
            toolExecutorWithQuery(), conversationStore);

        List<JSONObject> errors = new CopyOnWriteArrayList<>();
        AgentRunResult result = failingEngine.run(requestWithAgent("ark-unbound"), collectSink(errors));

        assertTrue(result.isError());
        assertFalse(errors.isEmpty());
        assertTrue(result.getErrorMessage().contains("自动同步失败"));
    }

    // ---------------- 假件与工具方法 ----------------

    private static AgentRequest request() {
        return requestWithAgent("ark-test");
    }

    private static AgentRequest requestWithAgent(String agentId) {
        return new AgentRequest("sess-1", "帮我看看", "zh-CN", null, agentId,
            ToolExecutionMode.BACKEND, 0, null, null);
    }

    private static boolean isUserMessage(JSONArray events) {
        return "user.message".equals(firstType(events));
    }

    private static String firstType(JSONArray events) {
        return events.isEmpty() ? "" : events.getJSONObject(0).getStr("type", "");
    }

    private static JSONObject statusRunning() {
        return new JSONObject().set("id", "sevt-r").set("type", "session.status_running");
    }

    private static JSONObject message(String text) {
        return new JSONObject().set("id", "sevt-m").set("type", "agent.message")
            .set("content", textBlocks(text));
    }

    private static JSONArray textBlocks(String text) {
        JSONArray blocks = new JSONArray();
        blocks.add(new JSONObject().set("type", "text").set("text", text));
        return blocks;
    }

    private static JSONObject usage(long in, long out) {
        return new JSONObject().set("id", "sevt-u").set("type", "span.model_request_end")
            .set("model_usage", new JSONObject().set("input_tokens", in).set("output_tokens", out));
    }

    private static JSONObject idleEndTurn() {
        return new JSONObject().set("id", "sevt-e").set("type", "session.status_idle")
            .set("stop_reason", new JSONObject().set("type", "end_turn"));
    }

    private static JSONObject idleRequiresAction(String eventId) {
        JSONArray eventIds = new JSONArray();
        eventIds.add(eventId);
        return new JSONObject().set("id", "sevt-ra").set("type", "session.status_idle")
            .set("stop_reason", new JSONObject().set("type", "requires_action")
                .set("event_ids", eventIds));
    }

    private static JSONObject customToolUse(String id, String name, String inputJson) {
        return new JSONObject().set("id", id).set("type", "agent.custom_tool_use")
            .set("name", name)
            .set("input", new JSONObject(cn.hutool.json.JSONUtil.parseObj(inputJson)));
    }

    private static JSONObject toolResult(String toolUseId) {
        return new JSONObject().set("id", "tr").set("type", "agent.tool_result")
            .set("tool_use_id", toolUseId)
            .set("content", textBlocks("done"));
    }

    private static JSONObject accepted(JSONArray events) {
        JSONArray data = new JSONArray();
        for (int i = 0; i < events.size(); i++) {
            data.add(new JSONObject().set("id", "ack-" + i).set("type", events.getJSONObject(i).getStr("type")));
        }
        return new JSONObject().set("data", data);
    }

    private AgentEventSink collectSink(List<JSONObject> errors) {
        return event -> {
            if ("error".equals(event.getType())) {
                errors.add(event.getData());
            }
        };
    }

    private AgentProviderConfigService fakeProviderConfig() {
        return new AgentProviderConfigService(null, new AgentProperties(),
            (AgentModelConfigService) null) {
            @Override
            public ArkConfig getArkConfig() {
                ArkConfig cfg = new ArkConfig();
                cfg.setBaseUrl("http://ark.fake/api/v3");
                cfg.setApiKey("test-key");
                cfg.setEnvironmentId("env-fake-1");
                return cfg;
            }

            @Override
            public boolean isArkDefaultReady() {
                return true;
            }
        };
    }

    private ToolExecutorRegistry toolExecutorWithQuery() {
        ToolExecutorRegistry registry = new ToolExecutorRegistry();
        registry.register(new ToolExecutor() {
            @Override
            public String name() {
                return "query";
            }

            @Override
            public ToolResult execute(JSONObject args, cn.boommanpro.gaia.workflow.app.agent.core.AgentRunContext context) {
                return ToolResult.ok("{\"result\":\"ok\"}");
            }
        });
        return registry;
    }

    /** 空注册表：任何工具名都无执行器（模拟不可用工具） */
    private static ToolExecutorRegistry emptyToolExecutorRegistry() {
        return new ToolExecutorRegistry();
    }

    private static void awaitTrue(java.util.function.BooleanSupplier condition, long timeoutMillis)
        throws InterruptedException {
        long deadline = System.currentTimeMillis() + timeoutMillis;
        while (!condition.getAsBoolean()) {
            if (System.currentTimeMillis() > deadline) {
                throw new AssertionError("condition not met within " + timeoutMillis + "ms");
            }
            Thread.sleep(50);
        }
    }

    /** 捕获所有发送的事件并允许脚本化下发方舟事件 */
    private static class FakeArkClient extends ArkManagedClient {
        final List<JSONArray> sentEvents = new CopyOnWriteArrayList<>();
        final List<JSONObject> sentToolResults = new CopyOnWriteArrayList<>();
        volatile java.util.function.Function<JSONArray, JSONObject> onSendEvents = events -> new JSONObject();

        void emit(JSONObject event) {
            Consumer<JSONObject> consumer = eventConsumer.get();
            if (consumer != null) {
                consumer.accept(event);
            }
        }

        private final AtomicReference<Consumer<JSONObject>> eventConsumer = new AtomicReference<>(null);

        @Override
        public JSONObject createSession(AgentProviderConfigService.ArkConfig cfg, String agentId,
                                        Integer agentVersion, String title) {
            return new JSONObject().set("id", "sesn-fake-1").set("status", "idle");
        }

        @Override
        public JSONObject sendEvents(AgentProviderConfigService.ArkConfig cfg, String sessionId, JSONArray events) {
            sentEvents.add(events);
            JSONObject response = onSendEvents.apply(events);
            return response != null ? response : new JSONObject().set("data", new JSONArray());
        }

        @Override
        public ArkManagedClient.StreamHandle openEventStream(AgentProviderConfigService.ArkConfig cfg,
                                                             String sessionId,
                                                             Consumer<JSONObject> consumer,
                                                             Runnable onClosed) {
            eventConsumer.set(consumer);
            ArkManagedClient.StreamHandle handle = new ArkManagedClient.StreamHandle(null, null);
            handle.readyLatch().countDown();
            return handle;
        }
    }

    private static class RecordingArkSessionService extends ArkAgentSessionService {
        volatile String remoteSessionId;
        final JSONObject recordedUsage = new JSONObject();

        RecordingArkSessionService() {
            super(null);
        }

        @Override
        public AgentSession findByKey(String sessionKey) {
            AgentSession row = new AgentSession();
            row.setSessionKey(sessionKey);
            row.setTitle("测试会话");
            row.setEngine("ark");
            return row;
        }

        @Override
        public String ensureRemoteSession(String sessionKey, String agentId, Integer agentVersion,
                                          java.util.function.Supplier<String> remoteSessionCreator) {
            if (remoteSessionId == null) {
                remoteSessionId = remoteSessionCreator.get();
            }
            return remoteSessionId;
        }

        @Override
        public void recordUsage(String sessionKey, JSONObject usageDelta) {
            for (String key : usageDelta.keySet()) {
                recordedUsage.set(key, usageDelta.get(key));
            }
        }

        @Override
        public boolean isArkConfigured(AgentProviderConfigService.ArkConfig cfg) {
            return true;
        }
    }

    private static class InMemoryConversationStore implements ConversationStore {
        final List<LlmMessage> messages = new ArrayList<>();

        @Override
        public List<LlmMessage> loadHistory(String sessionKey, int maxMessages) {
            return messages;
        }

        @Override
        public void saveMessage(String sessionKey, String role, String content,
                                String toolCallsJson, String toolCallId) {
            LlmMessage message = new LlmMessage();
            message.setRole(role);
            message.setContent(content);
            message.setToolCallId(toolCallId);
            messages.add(message);
        }

        @Override
        public String newSessionKey() {
            return "sess-" + System.nanoTime();
        }

        boolean hasToolMessage(String toolCallId) {
            return messages.stream().anyMatch(m -> "tool".equals(m.getRole()) && toolCallId.equals(m.getToolCallId()));
        }

        boolean hasToolMessagePayloadContaining(String fragment) {
            return messages.stream().anyMatch(m -> "tool".equals(m.getRole())
                && m.getContent() != null && m.getContent().contains(fragment));
        }
    }
}
