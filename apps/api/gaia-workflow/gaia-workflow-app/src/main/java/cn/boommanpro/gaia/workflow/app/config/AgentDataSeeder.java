package cn.boommanpro.gaia.workflow.app.config;

import cn.boommanpro.gaia.workflow.app.service.AgentModelConfigService;
import cn.boommanpro.gaia.workflow.app.service.AgentToolRegistry;
import cn.boommanpro.gaia.workflow.infra.manage.entity.AgentConfig;
import cn.boommanpro.gaia.workflow.infra.manage.entity.LlmModel;
import cn.boommanpro.gaia.workflow.infra.manage.service.AgentConfigService;
import cn.boommanpro.gaia.workflow.infra.manage.service.LlmModelService;
import cn.hutool.json.JSONObject;
import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

/**
 * Agent 静态种子数据初始化器
 *
 * <p>应用启动后幂等灌入 LLM 模型配置并确保工具定义已播种，同时清理已下线功能遗留的配置行。
 * 使用 {@link ApplicationRunner} 保证在 Spring 完全启动（schema.sql 已执行）后运行。</p>
 *
 * <p>系统提示词走 agent_prompt_config（AgentPromptComposer），节点知识走 agent_skill_file
 * （AgentSkillCatalog），都不再经过本类。</p>
 */
@Slf4j
@Component
public class AgentDataSeeder implements ApplicationRunner {

    /**
     * agent_config 里的注册回执：content 存 yml 模型指纹（base_url|model_id），config_data 存对应 llm_model.id。
     * 有它且指纹未变 = 这份 yml 已注册过，用户之后在模型管理里改名/改 key/删除都算用户决定，不再重灌；
     * yml 换了模型或地址 → 指纹变化 → 重新注册一条。
     */
    static final String LLM_MODEL_SEED_KEY = "model.seed.yml";

    private final AgentConfigService configService;
    private final AgentToolRegistry toolRegistry;
    private final AgentProperties properties;
    private final LlmModelService llmModelService;
    private final AgentModelConfigService modelConfigService;

    public AgentDataSeeder(AgentConfigService configService,
                           AgentToolRegistry toolRegistry,
                           AgentProperties properties,
                           LlmModelService llmModelService,
                           AgentModelConfigService modelConfigService) {
        this.configService = configService;
        this.toolRegistry = toolRegistry;
        this.properties = properties;
        this.llmModelService = llmModelService;
        this.modelConfigService = modelConfigService;
    }

    @Override
    public void run(ApplicationArguments args) {
        try {
            int modelCount = seedModelConfig();
            int modelEntryCount = seedDefaultLlmModel();
            // 确保工具定义已播种（@PostConstruct 时机可能早于 schema.sql 执行）
            toolRegistry.ensureSeeded();
            log.info("Agent seed data check complete: modelConfig={}, llmModel={}", modelCount, modelEntryCount);
        } catch (Exception e) {
            log.warn("Agent seed data initialization failed: {}", e.getMessage(), e);
        }
    }

    /**
     * 灌入模型配置到 agent_config，configKey=llm_config
     * 使用 application.yml 默认值初始化，用户可在管理后台修改
     *
     * @return 灌入条数（0 表示已存在跳过）
     */
    private int seedModelConfig() {
        long existing = configService.count(
                new QueryWrapper<AgentConfig>().eq("config_key", "llm_config"));
        if (existing > 0) {
            log.debug("LLM config already exists, skip.");
            return 0;
        }
        JSONObject configData = new JSONObject()
                .set("apiHost", properties.getLlm().getApiHost())
                .set("apiKey", properties.getLlm().getApiKey())
                .set("model", properties.getLlm().getModel())
                .set("temperature", properties.getLlm().getTemperature())
                .set("maxTokens", properties.getLlm().getMaxTokens())
                .set("contextWindow", properties.getLlm().getContextWindow());
        String now = LocalDateTime.now().toString();
        AgentConfig config = new AgentConfig();
        config.setConfigKey("llm_config");
        config.setConfigType("llm_config");
        config.setTitle("LLM 模型配置");
        config.setContent("Agent 对话使用的模型配置，修改后即时生效");
        config.setConfigData(configData.toString());
        config.setDescription("包含 apiHost/apiKey/model/temperature/maxTokens/contextWindow");
        config.setCreatedAt(now);
        config.setUpdatedAt(now);
        configService.save(config);
        log.info("Seeded LLM model config: model={}", properties.getLlm().getModel());
        return 1;
    }

    /**
     * 把 application.yml 的 agent.llm（自研引擎模型）注册为模型管理（llm_model）里的一条可见条目，
     * 全局默认模型未设置时指向它 —— 全新部署启动后模型管理页不再空白，会话引擎开箱即用。
     *
     * <p>此前 yml 只灌进 agent_config.llm_config（知识库/旧链路用），模型管理页永远是空的，
     * 用户得手动再录一遍同样的配置（2026-10-26 用户反馈）。</p>
     *
     * @return 新建条数（0 = 已注册/复用既有条目/yml 不完整跳过）
     */
    int seedDefaultLlmModel() {
        AgentProperties.Llm llm = properties.getLlm();
        String baseUrl = trimToNull(llm.getApiHost());
        String modelId = trimToNull(llm.getModel());
        if (baseUrl == null || modelId == null) {
            log.info("[model-seed] agent.llm.api-host / model 为空，跳过注册到模型管理");
            return 0;
        }
        String fingerprint = baseUrl + "|" + modelId;
        AgentConfig marker = configService.getOne(
            new QueryWrapper<AgentConfig>().eq("config_key", LLM_MODEL_SEED_KEY));
        if (marker != null && fingerprint.equals(marker.getContent())) {
            log.debug("[model-seed] yml model already registered ({}), skip.", fingerprint);
            return 0;
        }

        // 同地址 + 同模型的条目已存在（用户手动录过 / 旧指纹留下的）：复用，不重复建
        LlmModel entry = llmModelService.getOne(new QueryWrapper<LlmModel>()
            .eq("base_url", baseUrl).eq("model_id", modelId).last("LIMIT 1"));
        boolean created = false;
        if (entry == null) {
            String now = LocalDateTime.now().toString();
            entry = new LlmModel();
            entry.setDisplayName(uniqueDisplayName(modelId));
            // 不猜厂商：ThinkingParamPlanner 对 custom 按 modelId 推断思考参数，与手动录入 custom 条目一致
            entry.setVendor("custom");
            entry.setBaseUrl(baseUrl);
            entry.setApiKey(llm.getApiKey());
            entry.setModelId(modelId);
            entry.setTemperature(llm.getTemperature());
            entry.setMaxTokens(llm.getMaxTokens() > 0 ? llm.getMaxTokens() : null);
            entry.setContextWindow(llm.getContextWindow() > 0 ? llm.getContextWindow() : null);
            entry.setEnabled(1);
            entry.setSortOrder(0);
            entry.setCreatedAt(now);
            entry.setUpdatedAt(now);
            llmModelService.save(entry);
            created = true;
            log.info("[model-seed] registered yml model into llm_model: id={} displayName={} model={} baseUrl={}",
                entry.getId(), entry.getDisplayName(), modelId, baseUrl);
        } else {
            log.info("[model-seed] reuse existing llm_model id={} for yml model {}", entry.getId(), fingerprint);
        }

        // 全局默认未设置才接管：用户已选过默认模型的，不替用户换
        if (entry.getId() != null && modelConfigService.getActiveModelId() == null) {
            modelConfigService.setActiveModelId(entry.getId());
            log.info("[model-seed] global default model set to llm_model id={}", entry.getId());
        }
        writeMarker(marker, fingerprint, entry.getId());
        return created ? 1 : 0;
    }

    /** 显示名以 modelId 为主（模型管理里一眼可认），撞名时追加 (yml) / (yml N) 后缀 */
    private String uniqueDisplayName(String modelId) {
        String candidate = modelId;
        for (int i = 0; i < 50; i++) {
            long taken = llmModelService.count(new QueryWrapper<LlmModel>().eq("display_name", candidate));
            if (taken == 0) {
                return candidate;
            }
            candidate = i == 0 ? modelId + " (yml)" : modelId + " (yml " + (i + 1) + ")";
        }
        return modelId + " (yml " + System.currentTimeMillis() + ")";
    }

    private void writeMarker(AgentConfig marker, String fingerprint, Long llmModelId) {
        String now = LocalDateTime.now().toString();
        if (marker == null) {
            marker = new AgentConfig();
            marker.setConfigKey(LLM_MODEL_SEED_KEY);
            marker.setConfigType("model_setting");
            marker.setTitle("yml 模型注册回执");
            marker.setCreatedAt(now);
        }
        marker.setContent(fingerprint);
        marker.setConfigData(new JSONObject().set("llmModelId", llmModelId).set("fingerprint", fingerprint).toString());
        marker.setDescription("application.yml agent.llm 已注册到模型管理（llm_model.id=" + llmModelId
            + "）；base_url|model_id 指纹变化时重新注册，用户对该条目的后续改动不回灌");
        marker.setUpdatedAt(now);
        if (marker.getId() == null) {
            configService.save(marker);
        } else {
            configService.updateById(marker);
        }
    }

    private static String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
