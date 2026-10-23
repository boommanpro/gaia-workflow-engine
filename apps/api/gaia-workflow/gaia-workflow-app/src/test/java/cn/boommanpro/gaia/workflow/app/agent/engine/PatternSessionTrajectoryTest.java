package cn.boommanpro.gaia.workflow.app.agent.engine;

import cn.boommanpro.gaia.workflow.app.agent.core.Agent;
import cn.boommanpro.gaia.workflow.app.agent.core.AgentDefinition;
import cn.boommanpro.gaia.workflow.app.agent.core.AgentRegistry;
import cn.boommanpro.gaia.workflow.app.agent.core.AgentRequest;
import cn.boommanpro.gaia.workflow.app.agent.core.AgentRunResult;
import cn.boommanpro.gaia.workflow.app.agent.core.ConversationStore;
import cn.boommanpro.gaia.workflow.app.agent.event.AgentEvent;
import cn.boommanpro.gaia.workflow.app.agent.llm.LlmMessage;
import cn.boommanpro.gaia.workflow.app.agent.session.SessionArtifactStore;
import cn.boommanpro.gaia.workflow.app.agent.session.SessionWorkflowDraftService;
import cn.boommanpro.gaia.workflow.app.agent.session.SessionWorkflowStore;
import cn.boommanpro.gaia.workflow.app.agent.tool.ToolExecutor;
import cn.boommanpro.gaia.workflow.app.agent.tool.ToolExecutorRegistry;
import cn.boommanpro.gaia.workflow.app.agent.tool.impl.EdgeToolExecutor;
import cn.boommanpro.gaia.workflow.app.agent.tool.impl.GetToolExecutor;
import cn.boommanpro.gaia.workflow.app.agent.tool.impl.NodeToolExecutor;
import cn.boommanpro.gaia.workflow.app.agent.tool.impl.RunToolExecutor;
import cn.boommanpro.gaia.workflow.app.config.AgentProperties;
import cn.boommanpro.gaia.workflow.app.executor.SingleNodeExecutor;
import cn.boommanpro.gaia.workflow.app.service.AgentModelConfigService;
import cn.boommanpro.gaia.workflow.app.service.AgentPromptComposer;
import cn.boommanpro.gaia.workflow.app.service.AgentSkillCatalog;
import cn.boommanpro.gaia.workflow.app.service.AgentToolRegistry;
import cn.boommanpro.gaia.workflow.app.service.DraftRunService;
import cn.boommanpro.gaia.workflow.app.service.WorkflowTestCaseOrchestrator;
import cn.boommanpro.gaia.workflow.infra.extend.node.ChainParserManager;
import cn.boommanpro.gaia.workflow.infra.manage.entity.AgentToolDefinition;
import cn.boommanpro.gaia.workflow.infra.manage.service.AgentArtifactService;
import cn.boommanpro.gaia.workflow.infra.manage.service.AgentLlmCallLogService;
import cn.boommanpro.gaia.workflow.infra.manage.service.AgentToolCallLogService;
import cn.boommanpro.gaia.workflow.infra.manage.service.AgentToolDefinitionService;
import cn.hutool.json.JSONArray;
import cn.hutool.json.JSONObject;
import cn.hutool.json.JSONUtil;
import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.io.IOException;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.atomic.AtomicReference;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * 模式会话轨迹回放（P1/P2 验收 + skill-gate 负例）——「会话完美创建工作流」的确定性等价物。
 * <p>
 * 与 {@link AgentScopeTrajectoryReplayTest}（echo 工具验证引擎管道）不同，这里装配
 * <b>真实的 get / node / edge / run 工具执行器</b>（真实草稿服务 + 真实 DraftRunService
 * + 真实 GaiaWorkflow 引擎），ScriptedChatModel 按轨迹回放模型的工具调用：
 * 查画布 → 拆骨架 → 加节点 → 配输入输出 → 真跑验证。整条链路零真实 LLM、毫秒级、可进 CI。
 * <ul>
 *   <li>P1（纯转换）：start → string-format → end，断言草稿结构与试跑输出</li>
 *   <li>P2（智能处理）：start → llm(扁平字段归一) → code(后处理) → end，llm 指向本地 mock 服务</li>
 *   <li>负例：未触碰知识直接 node 盲写，skill-gate 必须拦截且草稿不被污染</li>
 * </ul>
 */
@DisplayName("模式会话轨迹回放：P1/P2 会话级搭建验收（真实工具链，零 LLM）")
class PatternSessionTrajectoryTest {

    private static final String P1_RESOURCE = "/agent/trajectories/p1-string-format.json";
    private static final String P2_RESOURCE = "/agent/trajectories/p2-llm-code.json";
    private static final String GATE_RESOURCE = "/agent/trajectories/gate-violation.json";
    private static final String MOCK_REPLY = "mock-llm-reply";

    private final AtomicReference<String> receivedBody = new AtomicReference<>();

    @BeforeAll
    static void registerParsers() {
        // run 工具会走真实 GaiaWorkflow 引擎，需注册全部节点解析器
        new ChainParserManager().initParserMap();
    }

    /** 引擎 + 真实工具链的组装结果（每个用例独立装配，互不串草稿） */
    private static final class Harness {
        final AgentScopeExecutionEngine engine;
        final SessionWorkflowDraftService draftService;
        final List<AgentEvent> events = Collections.synchronizedList(new ArrayList<>());

        Harness(AgentScopeExecutionEngine engine, SessionWorkflowDraftService draftService) {
            this.engine = engine;
            this.draftService = draftService;
        }
    }

    private Harness buildHarness(String scriptedResource, ConversationStore store) {
        SessionWorkflowDraftService draftService = new SessionWorkflowDraftService(
            new SessionArtifactStore(mock(AgentArtifactService.class), null),
            mock(SessionWorkflowStore.class));

        AgentProperties properties = new AgentProperties();
        properties.getLlm().setScripted(true);
        properties.getLlm().setScriptedResource(scriptedResource);

        AgentDefinition definition = new AgentDefinition();
        definition.setId("pattern-agent");
        definition.setDescription("模式轨迹回放");
        definition.setEngine("agentscope");
        definition.setToolNames(Collections.emptySet());

        Agent agent = mock(Agent.class);
        when(agent.getDefinition()).thenReturn(definition);
        AgentRegistry agentRegistry = mock(AgentRegistry.class);
        when(agentRegistry.route(any())).thenReturn(Optional.of(agent));

        // 真实工具执行器（get/node/edge/run）——schema 直接取注册表种子，保证与生产同形
        ToolExecutorRegistry executors = mock(ToolExecutorRegistry.class);
        AgentModelConfigService modelConfigService = mock(AgentModelConfigService.class);
        when(modelConfigService.getLlmConfig()).thenReturn(mock(AgentModelConfigService.LlmConfig.class));
        when(modelConfigService.getLlmConfig(anyString()))
            .thenReturn(mock(AgentModelConfigService.LlmConfig.class));
        DraftRunService draftRunService = new DraftRunService(modelConfigService);
        stubExecutor(executors, "get", new GetToolExecutor(draftService, mock(AgentSkillCatalog.class),
            mock(cn.boommanpro.gaia.workflow.infra.manage.service.GaiaWorkflowService.class)));
        stubExecutor(executors, "node", new NodeToolExecutor(draftService));
        stubExecutor(executors, "edge", new EdgeToolExecutor(draftService));
        stubExecutor(executors, "run", new RunToolExecutor(
            draftService, new SingleNodeExecutor(), draftRunService,
            mock(WorkflowTestCaseOrchestrator.class),
            mock(cn.boommanpro.gaia.workflow.app.agent.session.SessionArtifactStore.class)));

        cn.boommanpro.gaia.workflow.app.agent.runtime.SystemPromptResolver promptResolver =
            mock(cn.boommanpro.gaia.workflow.app.agent.runtime.SystemPromptResolver.class);
        when(promptResolver.resolve(eq(definition), anyString())).thenReturn("system prompt");

        AgentScopeExecutionEngine engine = new AgentScopeExecutionEngine(agentRegistry, executors,
            schemaRegistryOf("get", "node", "edge", "run"),
            promptResolver, store, modelConfigService,
            mock(AgentToolCallLogService.class), mock(AgentLlmCallLogService.class), properties);
        return new Harness(engine, draftService);
    }

    /**
     * 递归剥除 schema 中的 required 声明。
     * <p>
     * AgentScope 内置参数校验与 ScriptedChatModel 的 args 装配存在已知交互问题
     * （见 {@link AgentScopeTrajectoryReplayTest} 同款注释）：声明 required 时
     * 框架校验误报缺失并拒绝执行。轨迹回放的验收面是「我们的工具链与草稿语义」，
     * 参数本身的 required 约束由 ToolArgsValidatorTest 覆盖，此处剥除即可。
     */
    private static JSONObject stripRequired(JSONObject schema) {
        schema.remove("required");
        for (String key : new ArrayList<>(schema.keySet())) {
            Object value = schema.get(key);
            if (value instanceof JSONObject) {
                stripRequired((JSONObject) value);
            } else if (value instanceof JSONArray) {
                for (Object item : (JSONArray) value) {
                    if (item instanceof JSONObject) {
                        stripRequired((JSONObject) item);
                    }
                }
            }
        }
        return schema;
    }

    private static void stubExecutor(ToolExecutorRegistry registry, String name, ToolExecutor executor) {
        when(registry.get(name)).thenReturn(Optional.of(executor));
    }

    /** 从注册表种子 schema 挑选指定工具，构造成启用态定义（与生产 Toolkit 同形） */
    private static AgentToolRegistry schemaRegistryOf(String... toolNames) {
        JSONArray seed = new AgentToolRegistry(
            mock(AgentToolDefinitionService.class),
            mock(AgentPromptComposer.class),
            mock(AgentSkillCatalog.class)).buildToolsSchema();
        Set<String> wanted = Set.of(toolNames);
        List<AgentToolDefinition> defs = new ArrayList<>();
        for (Object item : seed) {
            JSONObject fn = ((JSONObject) item).getJSONObject("function");
            if (!wanted.contains(fn.getStr("name"))) {
                continue;
            }
            AgentToolDefinition def = new AgentToolDefinition();
            def.setToolName(fn.getStr("name"));
            def.setDescription(fn.getStr("description"));
            def.setParameters(stripRequired(fn.getJSONObject("parameters")).toString());
            def.setEnabled(1);
            defs.add(def);
        }
        AgentToolRegistry registry = mock(AgentToolRegistry.class);
        when(registry.getToolDefinitions()).thenReturn(defs);
        for (AgentToolDefinition def : defs) {
            when(registry.getToolParameters(def.getToolName()))
                .thenReturn(JSONUtil.parseObj(def.getParameters()));
        }
        return registry;
    }

    private static AgentRequest request(String sessionKey, String message) {
        return new AgentRequest(sessionKey, message, null, null, null, null, null, null);
    }

    /** 组装带历史与脚本资源的完整环境并执行一次会话 */
    private Harness runSession(String scriptedResource, String sessionKey, String message) {
        ConversationStore store = mock(ConversationStore.class);
        when(store.loadHistory(eq(sessionKey), anyInt()))
            .thenReturn(List.of(LlmMessage.builder().role("user").content(message).build()));
        Harness h = buildHarness(scriptedResource, store);
        h.engine.run(request(sessionKey, message), h.events::add);
        return h;
    }

    private static List<AgentEvent> eventsOf(Harness h, String type) {
        List<AgentEvent> out = new ArrayList<>();
        for (AgentEvent e : h.events) {
            if (type.equals(e.getType())) {
                out.add(e);
            }
        }
        return out;
    }

    /** 最后一次指定工具的 tool_result 事件数据 */
    private static JSONObject lastToolResult(Harness h, String toolName) {
        JSONObject found = null;
        for (AgentEvent e : eventsOf(h, "tool_result")) {
            if (toolName.equals(e.getData().getStr("name"))) {
                found = e.getData();
            }
        }
        return found;
    }

    // ==================================================================
    // P1：start → string-format → end
    // ==================================================================

    @Test
    @DisplayName("P1 轨迹：查画布→拆骨架→加节点→配输入输出→真跑，输出 Hello, World!")
    void p1SessionBuildsStringFormatWorkflow() {
        Harness h = runSession("classpath:" + P1_RESOURCE.substring(1),
            "s-p1-traj", "帮我做一个输入名字渲染问候语的工作流");

        // ① 草稿结构：3 节点 2 连线（start_1 → greet_1 → end_1）
        JSONObject draft = h.draftService.get("s-p1-traj");
        assertNotNull(draft, "会话应产出草稿");
        JSONArray nodes = draft.getJSONArray("nodes");
        JSONArray edges = draft.getJSONArray("edges");
        assertEquals(3, nodes.size(), "节点数: " + nodes);
        assertEquals(2, edges.size(), "连线数: " + edges);
        assertTrue(edges.stream().noneMatch(e -> ((JSONObject) e).getStr("sourceNodeID").equals("start_1")
                && ((JSONObject) e).getStr("targetNodeID").equals("end_1")),
            "骨架直连边应已被拆除");

        // ② 事件协议：document 与 run tool_result 到位
        assertFalse(eventsOf(h, "document").isEmpty(), "草稿变更应广播 document 事件");

        JSONObject runResult = lastToolResult(h, "run");
        assertNotNull(runResult, "run 工具应被调用");
        JSONObject payload = JSONUtil.parseObj(runResult.getStr("payload"));
        assertTrue(payload.getBool("success", false), "整流试跑应成功: " + payload);
        assertEquals("Hello, World!", payload.getJSONObject("outputs").getStr("output"));
        assertEquals(0, payload.getJSONArray("failedNodes").size());
    }

    // ==================================================================
    // P2：start → llm(扁平字段) → code(后处理) → end
    // ==================================================================

    @Test
    @DisplayName("P2 轨迹：llm 扁平字段归一 + code 后处理 + 试跑输出结构化结果")
    void p2SessionBuildsLlmCodeWorkflow(@TempDir Path tempDir) throws Exception {
        HttpServer llmServer = startMockLlmServer();
        try {
            String fixture = readResource(P2_RESOURCE)
                .replace("__LLM_HOST__", "http://127.0.0.1:" + llmServer.getAddress().getPort() + "/v1");
            Path script = tempDir.resolve("p2-llm-code.json");
            Files.writeString(script, fixture);

            Harness h = runSession(script.toString(), "s-p2-traj", "翻译一句话并统计字数");

            // ① llm 扁平字段被归一且请求契约正确（prompt 模板渲染了上游输入）
            assertNotNull(receivedBody.get(), "mock LLM 服务应收到请求");
            JSONObject request = JSONUtil.parseObj(receivedBody.get());
            assertEquals("mock-model", request.getStr("model"));
            assertTrue(String.valueOf(request.getJSONArray("messages")).contains("你好，世界"),
                "prompt 应渲染 start 输出: " + receivedBody.get());

            // ② 草稿结构：4 节点 3 连线
            JSONObject draft = h.draftService.get("s-p2-traj");
            assertNotNull(draft);
            assertEquals(4, draft.getJSONArray("nodes").size());
            assertEquals(3, draft.getJSONArray("edges").size());

            // ②' 表单 schema 对齐：llm 节点 inputs 必须是规范形状（前端展示与手工节点一致）
            JSONObject llmNode = draft.getJSONArray("nodes").getJSONObject(2);
            assertEquals("llm", llmNode.getStr("type"));
            JSONObject llmInputs = llmNode.getJSONObject("data").getJSONObject("inputs");
            assertTrue(llmInputs.getJSONArray("required").contains("prompt"),
                "llm inputs.required 应含 prompt: " + llmInputs);
            assertEquals("prompt-editor", llmInputs.getJSONObject("properties")
                .getJSONObject("prompt").getJSONObject("extra").getStr("formComponent"));

            // ③ code 后处理落 end：大写 + 字数
            JSONObject runResult = lastToolResult(h, "run");
            assertNotNull(runResult);
            JSONObject payload = JSONUtil.parseObj(runResult.getStr("payload"));
            assertTrue(payload.getBool("success", false), "整流试跑应成功: " + payload);
            assertEquals(MOCK_REPLY.toUpperCase(), payload.getJSONObject("outputs").getStr("translation"));
            assertEquals(MOCK_REPLY.length(),
                ((Number) payload.getJSONObject("outputs").get("chars")).intValue());
        } finally {
            llmServer.stop(0);
        }
    }

    // ==================================================================
    // 负例：skill-gate
    // ==================================================================

    @Test
    @DisplayName("护栏：未查知识直接 node 盲写被 skill-gate 拦截，草稿零污染")
    void skillGateBlocksBlindNodeWrite() {
        Harness h = runSession("classpath:" + GATE_RESOURCE.substring(1),
            "s-gate-traj", "随便加个节点");

        JSONObject nodeResult = lastToolResult(h, "node");
        assertNotNull(nodeResult, "node 工具调用应产生结果事件");
        assertEquals("INVALID_ARGS", nodeResult.getStr("errorCode"), "应被 skill-gate 以参数错误拦截");
        assertTrue(String.valueOf(nodeResult.getStr("payload")).contains("先查知识"),
            "拦截文案应指引先查知识: " + nodeResult);

        JSONObject draft = h.draftService.get("s-gate-traj");
        assertTrue(draft.getJSONArray("nodes") == null || draft.getJSONArray("nodes").isEmpty(),
            "被拦截的会话不应产生任何草稿节点");
        assertTrue(eventsOf(h, "document").isEmpty(), "不应有 document 事件");
    }

    // ------------------------------------------------------------------

    private HttpServer startMockLlmServer() throws IOException {
        HttpServer server = HttpServer.create(new InetSocketAddress(0), 0);
        server.createContext("/v1/chat/completions", exchange -> {
            receivedBody.set(new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8));
            String resp = "{\"choices\":[{\"message\":{\"role\":\"assistant\","
                + "\"content\":\"" + MOCK_REPLY + "\"}}],\"usage\":{\"total_tokens\":1}}";
            byte[] out = resp.getBytes(StandardCharsets.UTF_8);
            exchange.getResponseHeaders().set("Content-Type", "application/json");
            exchange.sendResponseHeaders(200, out.length);
            try (OutputStream os = exchange.getResponseBody()) {
                os.write(out);
            }
        });
        server.start();
        return server;
    }

    private static String readResource(String classpath) throws IOException {
        String path = classpath.startsWith("/") ? classpath : "/" + classpath;
        try (java.io.InputStream is = PatternSessionTrajectoryTest.class.getResourceAsStream(path)) {
            assertNotNull(is, "资源不存在: " + classpath);
            return new String(is.readAllBytes(), StandardCharsets.UTF_8);
        }
    }
}
