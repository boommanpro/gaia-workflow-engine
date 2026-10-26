package cn.boommanpro.gaia.workflow.app.service;

import cn.boommanpro.gaia.workflow.app.config.AgentProperties;
import cn.boommanpro.gaia.workflow.infra.manage.entity.AgentConfig;
import cn.boommanpro.gaia.workflow.infra.manage.entity.LlmModel;
import cn.boommanpro.gaia.workflow.infra.manage.service.AgentConfigService;
import cn.boommanpro.gaia.workflow.infra.manage.service.AgentSessionService;
import cn.boommanpro.gaia.workflow.infra.manage.service.LlmModelService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * 平台默认模型解析（llm 节点凭证的唯一来源，AI 知识查询与前端手动新建预填共用）：
 * 模型管理全局默认条目（启用）> 旧 llm_config > yml。
 */
class AgentModelConfigServicePlatformDefaultTest {

    private AgentConfigService configService;
    private LlmModelService llmModelService;
    private AgentProperties properties;
    private AgentConfig activePointer;
    private AgentConfig legacyLlmConfig;

    @BeforeEach
    void setUp() {
        configService = mock(AgentConfigService.class);
        llmModelService = mock(LlmModelService.class);
        properties = new AgentProperties();
        properties.getLlm().setApiHost("https://yml.invalid/v1");
        properties.getLlm().setApiKey("sk-yml-placeholder");
        properties.getLlm().setModel("yml-model");
        activePointer = null;
        legacyLlmConfig = null;
        // getOne 按 QueryWrapper 的 eq 参数区分两把 key（mock 不解析 wrapper；MyBatis-Plus 3.5 的参数表
        // 在 getSqlSegment() 时才物化，所以先触发一次再读）
        when(configService.getOne(any())).thenAnswer(inv -> {
            com.baomidou.mybatisplus.core.conditions.query.QueryWrapper<?> wrapper = inv.getArgument(0);
            if (wrapper == null) return null;
            wrapper.getSqlSegment();
            String params = String.valueOf(wrapper.getParamNameValuePairs());
            if (params.contains(AgentModelConfigService.ACTIVE_MODEL_KEY)) return activePointer;
            if (params.contains(AgentModelConfigService.LLM_CONFIG_KEY)) return legacyLlmConfig;
            return null;
        });
    }

    private AgentModelConfigService service() {
        return new AgentModelConfigService(configService, properties, llmModelService,
            mock(AgentSessionService.class), new ThinkingParamPlanner());
    }

    private static AgentConfig pointer(long id) {
        AgentConfig c = new AgentConfig();
        c.setConfigKey(AgentModelConfigService.ACTIVE_MODEL_KEY);
        c.setContent(String.valueOf(id));
        return c;
    }

    private static LlmModel entry(long id, int enabled) {
        LlmModel m = new LlmModel();
        m.setId(id);
        m.setDisplayName("模型管理默认");
        m.setVendor("custom");
        m.setBaseUrl("https://managed.invalid/v1");
        m.setApiKey("sk-managed-placeholder");
        m.setModelId("managed-model");
        m.setEnabled(enabled);
        return m;
    }

    @Test
    @DisplayName("模型管理设了全局默认且启用：llm 节点凭证取该条目（用户换默认模型后 AI/手动新建都跟随）")
    void prefersEnabledGlobalDefaultEntry() {
        activePointer = pointer(5L);
        when(llmModelService.getById(5L)).thenReturn(entry(5L, 1));

        AgentModelConfigService.LlmConfig llm = service().getPlatformDefaultLlmConfig();

        assertEquals("managed-model", llm.getModel());
        assertEquals("https://managed.invalid/v1", llm.getApiHost());
        assertEquals("sk-managed-placeholder", llm.getApiKey());
    }

    @Test
    @DisplayName("全局默认条目被禁用/删除：回退 llm_config，再回退 yml，不静默返回空凭证")
    void fallsBackWhenGlobalDefaultDisabledOrMissing() {
        activePointer = pointer(9L);
        when(llmModelService.getById(anyLong())).thenReturn(entry(9L, 0));

        AgentModelConfigService.LlmConfig llm = service().getPlatformDefaultLlmConfig();

        assertEquals("yml-model", llm.getModel());
        assertEquals("https://yml.invalid/v1", llm.getApiHost());
        assertEquals("sk-yml-placeholder", llm.getApiKey());
    }

    @Test
    @DisplayName("未设全局默认：走旧 llm_config 链路")
    void usesLegacyLlmConfigWhenNoGlobalDefault() {
        legacyLlmConfig = new AgentConfig();
        legacyLlmConfig.setConfigKey(AgentModelConfigService.LLM_CONFIG_KEY);
        legacyLlmConfig.setConfigData("{\"apiHost\":\"https://legacy.invalid/v1\",\"apiKey\":\"sk-legacy-placeholder\",\"model\":\"legacy-model\"}");

        AgentModelConfigService.LlmConfig llm = service().getPlatformDefaultLlmConfig();

        assertEquals("legacy-model", llm.getModel());
        assertEquals("https://legacy.invalid/v1", llm.getApiHost());
    }
}
