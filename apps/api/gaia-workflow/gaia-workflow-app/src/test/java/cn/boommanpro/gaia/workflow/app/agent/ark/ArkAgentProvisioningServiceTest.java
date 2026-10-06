package cn.boommanpro.gaia.workflow.app.agent.ark;

import cn.boommanpro.gaia.workflow.app.agent.core.AgentDefinition;
import cn.boommanpro.gaia.workflow.app.agent.runtime.SystemPromptResolver;
import cn.boommanpro.gaia.workflow.app.agent.tool.ToolExecutor;
import cn.boommanpro.gaia.workflow.app.agent.tool.ToolExecutorRegistry;
import cn.boommanpro.gaia.workflow.app.agent.tool.ToolResult;
import cn.boommanpro.gaia.workflow.app.config.AgentProperties;
import cn.boommanpro.gaia.workflow.app.service.AgentModelConfigService;
import cn.boommanpro.gaia.workflow.app.service.AgentProviderConfigService;
import cn.boommanpro.gaia.workflow.app.service.AgentToolRegistry;
import cn.boommanpro.gaia.workflow.infra.manage.entity.AgentConfig;
import cn.boommanpro.gaia.workflow.infra.manage.service.AgentConfigService;
import cn.hutool.json.JSONArray;
import cn.hutool.json.JSONObject;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.LinkedHashSet;
import java.util.Set;
import java.util.concurrent.atomic.AtomicReference;
import java.util.function.Consumer;
import java.util.function.Function;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

@DisplayName("ArkAgentProvisioningService：定义 → 方舟 Agent 资源自动同步")
class ArkAgentProvisioningServiceTest {

    private FakeAgentClient client;
    private AtomicReference<AgentConfig> storedState;
    private ArkAgentProvisioningService service;

    @BeforeEach
    void setUp() {
        client = new FakeAgentClient();
        storedState = new AtomicReference<>(null);

        AgentProviderConfigService providerConfig = new AgentProviderConfigService(
            null, new AgentProperties(), (AgentModelConfigService) null) {
            @Override
            public ArkConfig getArkConfig() {
                ArkConfig cfg = new ArkConfig();
                cfg.setBaseUrl("http://ark.fake/api/v3");
                cfg.setApiKey("test-key");
                cfg.setEnvironmentId("env-fake");
                cfg.setDefaultModelId("doubao-test-model");
                return cfg;
            }
        };

        AgentConfigService configService = mock(AgentConfigService.class);
        when(configService.getOne(any())).thenAnswer(inv -> storedState.get());
        when(configService.save(any())).thenAnswer(inv -> {
            storedState.set(inv.getArgument(0));
            return true;
        });
        when(configService.updateById(any())).thenAnswer(inv -> {
            storedState.set(inv.getArgument(0));
            return true;
        });

        AgentToolRegistry toolRegistry = mock(AgentToolRegistry.class);
        JSONArray schemas = new JSONArray();
        schemas.add(new JSONObject().set("type", "function").set("function", new JSONObject()
            .set("name", "query")
            .set("description", "查询工作流")
            .set("parameters", new JSONObject().set("type", "object")
                .set("properties", new JSONObject().set("action", new JSONObject().set("type", "string"))))));
        // 前端专属工具：无后端执行器，不应被暴露
        schemas.add(new JSONObject().set("type", "function").set("function", new JSONObject()
            .set("name", "canvas")
            .set("description", "画布操作")
            .set("parameters", new JSONObject().set("type", "object"))));
        when(toolRegistry.getToolsSchema()).thenReturn(schemas);

        ToolExecutorRegistry executorRegistry = new ToolExecutorRegistry();
        executorRegistry.register(new ToolExecutor() {
            @Override
            public String name() {
                return "query";
            }

            @Override
            public ToolResult execute(JSONObject args, cn.boommanpro.gaia.workflow.app.agent.core.AgentRunContext context) {
                return ToolResult.ok("{}");
            }
        });

        SystemPromptResolver promptResolver = mock(SystemPromptResolver.class);
        when(promptResolver.resolve(any(), any())).thenReturn("测试系统提示词");

        service = new ArkAgentProvisioningService(
            client, providerConfig, configService, toolRegistry, executorRegistry, promptResolver);
    }

    /** 让 AgentToolRegistry 可被 mock 的测试基址配置 */
    private static AgentProviderConfigService.ArkConfig testArkConfig() {
        AgentProviderConfigService.ArkConfig cfg = new AgentProviderConfigService.ArkConfig();
        cfg.setBaseUrl("http://ark.fake/api/v3");
        cfg.setApiKey("test-key");
        cfg.setEnvironmentId("env-fake");
        cfg.setDefaultModelId("doubao-test-model");
        return cfg;
    }

    private static AgentDefinition definition() {
        Set<String> tools = new LinkedHashSet<>();
        tools.add("query");
        tools.add("canvas");
        return AgentDefinition.builder()
            .id("ark-auto")
            .name("自动同步助手")
            .description("测试描述")
            .engine("ark")
            .toolNames(tools)
            .source("test")
            .build();
    }

    @Test
    @DisplayName("payload：name=id、model 取配置、工具只暴露后端可执行项并映射 input_schema")
    void payloadMapping() {
        JSONObject payload = service.buildAgentPayload(definition(), testArkConfig());
        assertEquals("ark-auto", payload.getStr("name"));
        assertEquals("测试系统提示词", payload.getStr("system"));
        assertEquals("doubao-test-model", payload.getJSONObject("model").getStr("id"));

        JSONArray tools = payload.getJSONArray("tools");
        assertEquals(1, tools.size());
        JSONObject custom = tools.getJSONObject(0);
        assertEquals("custom", custom.getStr("type"));
        assertEquals("query", custom.getStr("name"));
        assertEquals("查询工作流", custom.getStr("description"));
        assertEquals("object", custom.getJSONObject("input_schema").getStr("type"));
    }

    @Test
    @DisplayName("arkSandboxTools=true 时 payload 附带沙箱内置工具集")
    void sandboxToolsetToggle() {
        AgentDefinition def = AgentDefinition.builder().id("ark-auto").name("n")
            .engine("ark").arkSandboxTools(true).source("test").build();
        JSONObject payload = service.buildAgentPayload(def, testArkConfig());
        JSONArray tools = payload.getJSONArray("tools");
        // 沙箱工具集 + 后端可执行的 query（toolNames 为空 = 暴露全部可执行工具）
        assertEquals(2, tools.size());
        assertEquals("agent_toolset_20260701", tools.getJSONObject(0).getStr("type"));
        assertEquals("custom", tools.getJSONObject(1).getStr("type"));
    }

    @Test
    @DisplayName("首次运行：自动创建远端 Agent 并保存映射")
    void firstRunCreates() {
        ArkAgentProvisioningService.ProvisionedAgent result = service.ensureProvisioned(definition());

        assertEquals(1, client.createCount.get());
        assertEquals("agent-new-1", result.getAgentId());
        assertEquals(Integer.valueOf(1), result.getVersion());
        assertTrue(result.isCreated());
        assertFalse(result.isUpdated());
        assertEquals("agent-new-1", storedState.get().getConfigData() != null
            ? new JSONObject(storedState.get().getConfigData()).getStr("agentId") : null);
    }

    @Test
    @DisplayName("无变更的后续运行：零远端调用")
    void unchangedSkipsRemote() {
        service.ensureProvisioned(definition());
        int createsAfterFirst = client.createCount.get();

        ArkAgentProvisioningService.ProvisionedAgent second = service.ensureProvisioned(definition());

        assertEquals(createsAfterFirst, client.createCount.get());
        assertEquals(0, client.updateCount.get());
        assertFalse(second.isCreated());
        assertFalse(second.isUpdated());
        assertEquals("agent-new-1", second.getAgentId());
    }

    @Test
    @DisplayName("定义变更：带版本乐观锁更新，映射记新版本")
    void changedDefinitionUpdates() {
        service.ensureProvisioned(definition());

        AgentDefinition changed = AgentDefinition.builder()
            .id("ark-auto").name("自动同步助手").description("新描述")
            .engine("ark").toolNames(new LinkedHashSet<>()).source("test")
            .build();
        ArkAgentProvisioningService.ProvisionedAgent result = service.ensureProvisioned(changed);

        assertEquals(1, client.updateCount.get());
        assertTrue(result.isUpdated());
        assertEquals(Integer.valueOf(2), result.getVersion());
        // 更新请求体必须带当前版本号（乐观锁）
        assertEquals(Integer.valueOf(1), client.lastUpdateBody.getInt("version"));
    }

    @Test
    @DisplayName("手动绑定：不触碰远端")
    void manualBoundSkipsProvisioning() {
        AgentDefinition bound = AgentDefinition.builder()
            .id("ark-bound").name("手动绑定").engine("ark")
            .arkAgentId("agent-manual").arkAgentVersion(3)
            .source("test").build();

        ArkAgentProvisioningService.ProvisionedAgent result = service.ensureProvisioned(bound);

        assertEquals("agent-manual", result.getAgentId());
        assertEquals(Integer.valueOf(3), result.getVersion());
        assertEquals(0, client.createCount.get());
        assertEquals(0, client.updateCount.get());
    }

    // ---------------- 假件 ----------------

    private static class FakeAgentClient extends ArkManagedClient {
        final java.util.concurrent.atomic.AtomicInteger createCount = new java.util.concurrent.atomic.AtomicInteger();
        final java.util.concurrent.atomic.AtomicInteger updateCount = new java.util.concurrent.atomic.AtomicInteger();
        volatile JSONObject lastUpdateBody;

        @Override
        public JSONObject createAgent(AgentProviderConfigService.ArkConfig cfg, String body) {
            createCount.incrementAndGet();
            return new JSONObject().set("id", "agent-new-1").set("version", 1);
        }

        @Override
        public JSONObject updateAgent(AgentProviderConfigService.ArkConfig cfg, String agentId, String body) {
            updateCount.incrementAndGet();
            lastUpdateBody = new JSONObject(body);
            return new JSONObject().set("id", agentId).set("version", lastUpdateBody.getInt("version", 1) + 1);
        }
    }
}
