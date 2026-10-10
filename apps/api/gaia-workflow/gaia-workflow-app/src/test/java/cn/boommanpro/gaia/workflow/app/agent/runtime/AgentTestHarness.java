package cn.boommanpro.gaia.workflow.app.agent.runtime;

import cn.boommanpro.gaia.workflow.app.agent.core.AgentDefinition;
import cn.boommanpro.gaia.workflow.app.agent.core.AgentRegistry;
import cn.boommanpro.gaia.workflow.app.agent.core.AgentRequest;
import cn.boommanpro.gaia.workflow.app.agent.core.ConversationStore;
import cn.boommanpro.gaia.workflow.app.agent.core.DefinitionBasedAgent;
import cn.boommanpro.gaia.workflow.app.agent.core.SteeringInbox;
import cn.boommanpro.gaia.workflow.app.agent.core.ToolPolicyService;
import cn.boommanpro.gaia.workflow.app.agent.context.ContextProviderRegistry;
import cn.boommanpro.gaia.workflow.app.agent.event.AgentEvent;
import cn.boommanpro.gaia.workflow.app.agent.event.AgentEventSink;
import cn.boommanpro.gaia.workflow.app.agent.llm.LlmChatRequest;
import cn.boommanpro.gaia.workflow.app.agent.llm.LlmChatResponse;
import cn.boommanpro.gaia.workflow.app.agent.llm.LlmMessage;
import cn.boommanpro.gaia.workflow.app.agent.llm.LlmProvider;
import cn.boommanpro.gaia.workflow.app.agent.llm.LlmProviderRegistry;
import cn.boommanpro.gaia.workflow.app.agent.llm.LlmToolCall;
import cn.boommanpro.gaia.workflow.app.agent.tool.ToolExecutor;
import cn.boommanpro.gaia.workflow.app.agent.tool.ToolExecutorRegistry;
import cn.boommanpro.gaia.workflow.app.agent.tool.ToolResult;
import cn.boommanpro.gaia.workflow.app.config.AgentProperties;
import cn.boommanpro.gaia.workflow.app.service.AgentToolRegistry;
import cn.hutool.json.JSONArray;
import cn.hutool.json.JSONObject;
import lombok.Data;

import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Deque;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicLong;
import java.util.function.Function;

/**
 * AgentRuntime 单测/轨迹回放共用的测试基座（纯内存，无 Spring/DB）。
 *
 * <p>对齐 dsh 快照回放测试的形态：脚本化 LLM（无 key 回放已录响应）+
 * 假会话存储 + 收集型事件端，跑完断言「持久化消息序列 + 事件序列 + 结果」。</p>
 */
public final class AgentTestHarness {

    private AgentTestHarness() {
    }

    // ---------------- 假会话存储 ----------------

    /** 内存版 ConversationStore：记录保存序列、支持预置历史与 compacted 断言 */
    public static class FakeConversationStore implements ConversationStore {
        public final List<SavedMessage> saved = new ArrayList<>();
        public final List<Long> compactedIds = new ArrayList<>();
        public final List<String> summaries = new ArrayList<>();
        private final AtomicLong idGen = new AtomicLong(100);
        final List<LlmMessage> history = new ArrayList<>();

        public void preload(String role, String content) {
            LlmMessage m = new LlmMessage();
            m.setRole(role);
            m.setContent(content);
            m.setRefId(idGen.incrementAndGet());
            history.add(m);
        }

        public void preloadMessage(LlmMessage message) {
            if (message.getRefId() == null) {
                message.setRefId(idGen.incrementAndGet());
            }
            history.add(message);
        }

        @Override
        public List<LlmMessage> loadHistory(String sessionKey, int maxMessages) {
            return new ArrayList<>(history);
        }

        @Override
        public void saveMessage(String sessionKey, String role, String content,
                                String toolCallsJson, String toolCallId) {
            saveMessage(sessionKey, role, content, toolCallsJson, toolCallId, (List<String>) null);
        }

        @Override
        public void saveMessage(String sessionKey, String role, String content,
                                String toolCallsJson, String toolCallId, List<String> images) {
            SavedMessage message = new SavedMessage();
            message.role = role;
            message.content = content;
            message.toolCallsJson = toolCallsJson;
            message.toolCallId = toolCallId;
            saved.add(message);
        }

        @Override
        public void saveMessage(String sessionKey, String role, String content,
                                String toolCallsJson, String toolCallId, String thinking) {
            SavedMessage message = new SavedMessage();
            message.role = role;
            message.content = content;
            message.toolCallsJson = toolCallsJson;
            message.toolCallId = toolCallId;
            message.thinking = thinking;
            saved.add(message);
        }

        @Override
        public String newSessionKey() {
            return UUID.randomUUID().toString().replace("-", "");
        }

        @Override
        public void markCompacted(String sessionKey, List<Long> messageIds) {
            compactedIds.addAll(messageIds);
        }

        @Override
        public Long saveSummary(String sessionKey, String content) {
            summaries.add(content);
            return idGen.incrementAndGet();
        }

        public List<String> roles() {
            List<String> roles = new ArrayList<>();
            for (SavedMessage m : saved) {
                roles.add(m.role);
            }
            return roles;
        }
    }

    @Data
    public static class SavedMessage {
        String role;
        String content;
        String toolCallsJson;
        String toolCallId;
        String thinking;
    }

    // ---------------- 脚本化 LLM ----------------

    /**
     * 脚本化 Provider：按序弹出预置响应；队列为空时返回默认终答（防跑飞）。
     * 同时记录每次请求的消息（断言模型实际看到的内容）。
     * 非流式双消息请求视为压缩器的摘要调用，返回 {@link #summaryResponse}。
     */
    public static class ScriptedLlmProvider implements LlmProvider {
        public final Deque<LlmChatResponse> script = new ArrayDeque<>();
        public final List<LlmChatRequest> requests = new ArrayList<>();
        public String summaryResponse = "SUMMARY-OF-PREFIX";
        public String defaultFinal = "（脚本耗尽，默认终答）";
        /** 摘要调用判定：非流式且消息数为 2 */
        public boolean isSummaryRequest(LlmChatRequest request) {
            return !request.isStream() && request.getMessages() != null && request.getMessages().size() == 2;
        }

        public void enqueue(LlmChatResponse response) {
            script.add(response);
        }

        public void enqueueText(String content) {
            script.add(LlmChatResponse.of(content));
        }

        public void enqueueToolCall(String callId, String name, String arguments) {
            LlmToolCall call = LlmToolCall.builder().id(callId).name(name).arguments(arguments).build();
            script.add(LlmChatResponse.builder().content("").toolCalls(List.of(call)).build());
        }

        public void enqueueFailed(String message, String errorCode) {
            script.add(LlmChatResponse.failed(message, errorCode));
        }

        /** 正文 + 多个工具调用（calls 每项 = {id, name, arguments}） */
        public void enqueueTextWithCalls(String content, String[]... calls) {
            List<LlmToolCall> list = new ArrayList<>();
            for (String[] c : calls) {
                list.add(LlmToolCall.builder().id(c[0]).name(c[1]).arguments(c[2]).build());
            }
            script.add(LlmChatResponse.builder().content(content).toolCalls(list).build());
        }

        @Override
        public String getId() {
            return "scripted";
        }

        @Override
        public String getName() {
            return "Scripted";
        }

        @Override
        public boolean isAvailable() {
            return true;
        }

        @Override
        public LlmChatResponse chat(LlmChatRequest request) {
            return chat(request, null);
        }

        @Override
        public LlmChatResponse chat(LlmChatRequest request, cn.boommanpro.gaia.workflow.app.agent.llm.TokenListener listener) {
            requests.add(request);
            if (isSummaryRequest(request)) {
                return LlmChatResponse.of(summaryResponse);
            }
            LlmChatResponse next = script.poll();
            if (next == null) {
                return LlmChatResponse.of(defaultFinal);
            }
            if (listener != null && next.getContent() != null) {
                listener.onToken(next.getContent());
            }
            return next;
        }
    }

    // ---------------- 收集型事件端 ----------------

    public static class CollectingSink implements AgentEventSink {
        public final List<AgentEvent> events = new ArrayList<>();

        @Override
        public void emit(AgentEvent event) {
            events.add(event);
        }

        public List<String> types() {
            List<String> types = new ArrayList<>();
            for (AgentEvent e : events) {
                types.add(e.getType());
            }
            return types;
        }

        /** 只看结构性事件（排除高频 token/thinking） */
        public List<String> structuralTypes() {
            List<String> types = new ArrayList<>();
            for (AgentEvent e : events) {
                if (!"token".equals(e.getType()) && !"thinking".equals(e.getType())) {
                    types.add(e.getType());
                }
            }
            return types;
        }

        public long count(String type) {
            return events.stream().filter(e -> type.equals(e.getType())).count();
        }

        public AgentEvent first(String type) {
            for (AgentEvent e : events) {
                if (type.equals(e.getType())) {
                    return e;
                }
            }
            return null;
        }
    }

    // ---------------- 脚本化工具 ----------------

    /** 行为可编程的工具执行器：args → result，可挂副作用 */
    public static class ScriptedTool implements ToolExecutor {
        private final String name;
        private final boolean concurrencySafe;
        public final List<JSONObject> receivedArgs = new ArrayList<>();
        private final Function<JSONObject, ToolResult> behavior;

        public ScriptedTool(String name, Function<JSONObject, ToolResult> behavior) {
            this(name, behavior, false);
        }

        public ScriptedTool(String name, Function<JSONObject, ToolResult> behavior, boolean concurrencySafe) {
            this.name = name;
            this.behavior = behavior;
            this.concurrencySafe = concurrencySafe;
        }

        @Override
        public String name() {
            return name;
        }

        @Override
        public boolean concurrencySafe() {
            return concurrencySafe;
        }

        @Override
        public ToolResult execute(JSONObject args, cn.boommanpro.gaia.workflow.app.agent.core.AgentRunContext context) {
            receivedArgs.add(args);
            return behavior.apply(args);
        }
    }

    // ---------------- 绕过 DB 的注册表替身 ----------------

    /** AgentToolRegistry 替身：schema 与参数校验全部旁路 */
    public static class FakeToolSchemaRegistry extends AgentToolRegistry {
        public FakeToolSchemaRegistry() {
            super(null, null);
        }

        @Override
        public JSONArray getToolsSchema(String pageContext) {
            return new JSONArray();
        }

        @Override
        public JSONObject getToolParameters(String toolName) {
            return null; // 跳过 schema 校验（校验本身有 ToolArgsValidatorTest 覆盖）
        }

        @Override
        public String getSystemPrompt(String locale, String pageContext) {
            return "TEST-SYSTEM-PROMPT";
        }
    }

    /** ToolPolicyService 替身：策略可编程，不触 DB */
    public static class FakePolicyService extends ToolPolicyService {
        public String policy = "always";
        public boolean confirmApproved = true;

        public FakePolicyService() {
            super(null, null, null, null, null);
        }

        @Override
        public String resolvePolicy(String sessionKey, String action) {
            return policy;
        }

        @Override
        public boolean decideConfirm(cn.boommanpro.gaia.workflow.app.agent.core.AgentRunContext context,
                                     LlmToolCall call, AgentEventSink sink) {
            return confirmApproved;
        }
    }

    // ---------------- 装配 ----------------

    public static class RuntimeFixture {
        public final ScriptedLlmProvider llm = new ScriptedLlmProvider();
        public final FakeConversationStore store = new FakeConversationStore();
        public final ToolExecutorRegistry executorRegistry = new ToolExecutorRegistry();
        public final FakePolicyService policy = new FakePolicyService();
        public final CollectingSink sink = new CollectingSink();
        public final AgentProperties properties = new AgentProperties();
        public final ContextCompactor compactor;
        public final AgentRuntime runtime;
        public final SteeringInbox inbox = new SteeringInbox();

        public RuntimeFixture(ToolExecutor... executors) {
            for (ToolExecutor executor : executors) {
                executorRegistry.register(executor);
            }
            AgentDefinition definition = AgentDefinition.builder()
                .id("test-agent")
                .name("Test Agent")
                .executionMode(cn.boommanpro.gaia.workflow.app.agent.core.ToolExecutionMode.BACKEND)
                .llmProviderId("scripted")
                .build();
            AgentRegistry agentRegistry = new AgentRegistry();
            agentRegistry.register(new DefinitionBasedAgent(definition));
            LlmProviderRegistry llmRegistry = new LlmProviderRegistry();
            llmRegistry.register(llm);
            this.compactor = new ContextCompactor(properties, store);
            this.runtime = new AgentRuntime(
                agentRegistry, llmRegistry, executorRegistry, new ContextProviderRegistry(),
                new FakeToolSchemaRegistry(), store,
                new SystemPromptResolver(new FakeToolSchemaRegistry(), null) {
                    @Override
                    public String resolve(AgentDefinition def, String locale) {
                        return "TEST-SYSTEM-PROMPT";
                    }
                },
                policy, null, null, compactor, properties);
        }

        public AgentRequest request(String sessionKey, String message) {
            Map<String, Object> variables = new HashMap<>();
            variables.put("steeringInbox", inbox);
            return new AgentRequest(sessionKey, message, "zh-CN", null,
                "test-agent", cn.boommanpro.gaia.workflow.app.agent.core.ToolExecutionMode.BACKEND,
                0, variables, "run-test");
        }

        public AgentRequest requestWithInterrupt(String sessionKey, String message,
                                                  java.util.function.BooleanSupplier interrupt) {
            AgentRequest request = request(sessionKey, message);
            request.getVariables().put("interrupt", interrupt);
            return request;
        }
    }
}
