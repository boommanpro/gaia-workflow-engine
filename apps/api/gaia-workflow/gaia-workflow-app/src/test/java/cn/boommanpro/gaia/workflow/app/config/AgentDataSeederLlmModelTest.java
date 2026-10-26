package cn.boommanpro.gaia.workflow.app.config;

import cn.boommanpro.gaia.workflow.app.service.AgentModelConfigService;
import cn.boommanpro.gaia.workflow.app.service.AgentToolRegistry;
import cn.boommanpro.gaia.workflow.infra.manage.entity.AgentConfig;
import cn.boommanpro.gaia.workflow.infra.manage.entity.LlmModel;
import cn.boommanpro.gaia.workflow.infra.manage.service.AgentConfigService;
import cn.boommanpro.gaia.workflow.infra.manage.service.LlmModelService;
import cn.hutool.json.JSONUtil;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.concurrent.atomic.AtomicReference;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * yml 自研引擎模型 → 模型管理（llm_model）自动注册（2026-10-26 用户反馈：启动后模型管理页空白，
 * 得手动再录一遍 yml 里的配置）。规则：注册一条可见条目；全局默认未设置时指向它；
 * 以 agent_config[model.seed.yml] 的 base_url|model_id 指纹做幂等 —— 用户之后改名/改 key/删除都不回灌。
 */
class AgentDataSeederLlmModelTest {

    private AgentConfigService configService;
    private LlmModelService llmModelService;
    private AgentModelConfigService modelConfigService;
    private AgentProperties properties;
    /** agent_config[model.seed.yml] 的模拟存储 */
    private final AtomicReference<AgentConfig> marker = new AtomicReference<>();
    /** llm_model.save 捕获 */
    private final AtomicReference<LlmModel> savedEntry = new AtomicReference<>();

    @BeforeEach
    void setUp() {
        configService = mock(AgentConfigService.class);
        when(configService.getOne(any())).thenAnswer(inv -> marker.get());
        when(configService.save(any())).thenAnswer(inv -> {
            AgentConfig c = inv.getArgument(0);
            c.setId(100L);
            marker.set(c);
            return true;
        });
        when(configService.updateById(any())).thenAnswer(inv -> {
            marker.set(inv.getArgument(0));
            return true;
        });

        llmModelService = mock(LlmModelService.class);
        when(llmModelService.getOne(any())).thenReturn(null);
        when(llmModelService.count(any())).thenReturn(0L);
        when(llmModelService.save(any())).thenAnswer(inv -> {
            LlmModel m = inv.getArgument(0);
            m.setId(7L);
            savedEntry.set(m);
            return true;
        });

        modelConfigService = mock(AgentModelConfigService.class);
        when(modelConfigService.getActiveModelId()).thenReturn(null);

        properties = new AgentProperties();
        properties.getLlm().setApiHost("https://www.dmxapi.cn/v1");
        properties.getLlm().setApiKey("sk-test-not-a-real-key");
        properties.getLlm().setModel("glm-4-flash");
        properties.getLlm().setTemperature(0.3);
        properties.getLlm().setMaxTokens(2048);
        properties.getLlm().setContextWindow(65536);
    }

    private AgentDataSeeder seeder() {
        return new AgentDataSeeder(configService, mock(AgentToolRegistry.class), properties,
            llmModelService, modelConfigService);
    }

    @Test
    @DisplayName("全新库：yml 模型注册为 llm_model 条目（字段原样映射、vendor=custom、enabled）、设为全局默认、写注册回执")
    void freshDatabaseRegistersAndSetsDefault() {
        int created = seeder().seedDefaultLlmModel();

        assertEquals(1, created);
        LlmModel entry = savedEntry.get();
        assertNotNull(entry, "必须写入 llm_model");
        assertEquals("glm-4-flash", entry.getDisplayName(), "显示名以 modelId 为主，模型管理里一眼可认");
        assertEquals("custom", entry.getVendor());
        assertEquals("https://www.dmxapi.cn/v1", entry.getBaseUrl());
        assertEquals("sk-test-not-a-real-key", entry.getApiKey());
        assertEquals("glm-4-flash", entry.getModelId());
        assertEquals(0.3, entry.getTemperature());
        assertEquals(2048, entry.getMaxTokens());
        assertEquals(65536, entry.getContextWindow());
        assertEquals(1, entry.getEnabled());
        assertNotNull(entry.getCreatedAt());

        verify(modelConfigService).setActiveModelId(7L);

        AgentConfig m = marker.get();
        assertNotNull(m, "必须写注册回执，否则每次重启都会重灌");
        assertEquals(AgentDataSeeder.LLM_MODEL_SEED_KEY, m.getConfigKey());
        assertEquals("https://www.dmxapi.cn/v1|glm-4-flash", m.getContent());
        assertEquals(7L, JSONUtil.parseObj(m.getConfigData()).getLong("llmModelId"));
    }

    @Test
    @DisplayName("回执指纹未变：即使用户已把条目删掉也不重灌、不碰全局默认（尊重用户决定）")
    void unchangedFingerprintIsIdempotentEvenAfterUserDeletedEntry() {
        AgentConfig existing = new AgentConfig();
        existing.setId(100L);
        existing.setConfigKey(AgentDataSeeder.LLM_MODEL_SEED_KEY);
        existing.setContent("https://www.dmxapi.cn/v1|glm-4-flash");
        marker.set(existing);

        int created = seeder().seedDefaultLlmModel();

        assertEquals(0, created);
        verify(llmModelService, never()).save(any());
        verify(modelConfigService, never()).setActiveModelId(anyLong());
        verify(configService, never()).updateById(any());
    }

    @Test
    @DisplayName("yml 换了模型（指纹变化）：重新注册一条新条目并更新回执；旧条目保留")
    void changedFingerprintRegistersNewEntry() {
        AgentConfig existing = new AgentConfig();
        existing.setId(100L);
        existing.setConfigKey(AgentDataSeeder.LLM_MODEL_SEED_KEY);
        existing.setContent("https://www.dmxapi.cn/v1|glm-4-plus");
        marker.set(existing);

        int created = seeder().seedDefaultLlmModel();

        assertEquals(1, created);
        assertEquals("glm-4-flash", savedEntry.get().getModelId());
        assertEquals("https://www.dmxapi.cn/v1|glm-4-flash", marker.get().getContent());
        verify(configService, times(1)).updateById(any());
        verify(configService, never()).save(any());
    }

    @Test
    @DisplayName("同地址同模型的条目已存在（用户手动录过）：复用不重复建，但补写回执并按需设默认")
    void existingEntryWithSameBaseUrlAndModelIsReused() {
        LlmModel manual = new LlmModel();
        manual.setId(3L);
        manual.setDisplayName("我的 GLM");
        manual.setBaseUrl("https://www.dmxapi.cn/v1");
        manual.setModelId("glm-4-flash");
        when(llmModelService.getOne(any())).thenReturn(manual);

        int created = seeder().seedDefaultLlmModel();

        assertEquals(0, created);
        verify(llmModelService, never()).save(any());
        verify(modelConfigService).setActiveModelId(3L);
        assertEquals(3L, JSONUtil.parseObj(marker.get().getConfigData()).getLong("llmModelId"));
    }

    @Test
    @DisplayName("用户已选过全局默认模型：注册条目但不替用户换默认")
    void doesNotOverrideExistingGlobalDefault() {
        when(modelConfigService.getActiveModelId()).thenReturn(42L);

        int created = seeder().seedDefaultLlmModel();

        assertEquals(1, created);
        verify(modelConfigService, never()).setActiveModelId(anyLong());
    }

    @Test
    @DisplayName("显示名撞车（已有同名但不同地址的条目）：追加 (yml) 后缀，不触发 displayName 唯一名冲突")
    void displayNameCollisionGetsSuffix() {
        when(llmModelService.count(any())).thenReturn(1L, 0L);

        seeder().seedDefaultLlmModel();

        assertEquals("glm-4-flash (yml)", savedEntry.get().getDisplayName());
    }

    @Test
    @DisplayName("yml 未配置地址或模型：跳过，不写任何数据")
    void blankYmlConfigIsSkipped() {
        properties.getLlm().setApiHost("   ");

        int created = seeder().seedDefaultLlmModel();

        assertEquals(0, created);
        assertNull(savedEntry.get());
        assertNull(marker.get());
        verify(modelConfigService, never()).setActiveModelId(anyLong());
    }
}
