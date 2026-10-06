package cn.boommanpro.gaia.workflow.app.service;

import cn.boommanpro.gaia.workflow.app.config.AgentProperties;
import cn.boommanpro.gaia.workflow.infra.manage.entity.AgentConfig;
import cn.boommanpro.gaia.workflow.infra.manage.service.AgentConfigService;
import cn.hutool.json.JSONObject;
import cn.hutool.json.JSONUtil;
import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

/**
 * 供应商级配置服务 —— 按 provider id 存取连接参数（DB 优先，application.yml 兜底）。
 *
 * <p>过去 {@link AgentModelConfigService} 只有一份全局 {@code llm_config}；
 * 引入方舟托管引擎后连接参数按 provider 隔离：</p>
 * <ul>
 *   <li>{@code provider_config:openai-compatible} —— 自研引擎的模型连接；
 *       未配置时回退读 {@code llm_config}（存量零迁移）</li>
 *   <li>{@code provider_config:ark} —— 方舟 baseUrl / apiKey / environmentId 等；
 *       未配置时回退 {@code agent.ark.*}</li>
 * </ul>
 *
 * <p>读取无缓存（对齐 {@link AgentModelConfigService} 惯例），配置中心改完即时生效。</p>
 */
@Slf4j
@Service
public class AgentProviderConfigService {

    public static final String ARK_CONFIG_KEY = "provider_config:ark";
    public static final String OPENAI_COMPATIBLE_CONFIG_KEY = "provider_config:openai-compatible";

    /** 默认执行引擎配置键（管理端「自研 / 方舟托管」切换）：configData {"mode":"local"|"ark"} */
    public static final String DEFAULT_ENGINE_CONFIG_KEY = "agent.engine.default";
    public static final String DEFAULT_ENGINE_CONFIG_TYPE = "engine_config";

    private final AgentConfigService configService;
    private final AgentProperties properties;
    private final AgentModelConfigService modelConfigService;

    public AgentProviderConfigService(AgentConfigService configService,
                                      AgentProperties properties,
                                      AgentModelConfigService modelConfigService) {
        this.configService = configService;
        this.properties = properties;
        this.modelConfigService = modelConfigService;
    }

    /** 方舟托管连接配置（DB provider_config:ark → yml agent.ark.* 兜底） */
    public ArkConfig getArkConfig() {
        AgentProperties.Ark fallback = properties.getArk();
        ArkConfig result = new ArkConfig();
        result.setBaseUrl(fallback.getBaseUrl());
        result.setApiKey(fallback.getApiKey());
        result.setEnvironmentId(fallback.getEnvironmentId());
        result.setDefaultModelId(fallback.getDefaultModelId());
        result.setDefaultAgentId(fallback.getDefaultAgentId());
        result.setConnectTimeoutMs(fallback.getConnectTimeoutMs());
        result.setReadTimeoutMs(fallback.getReadTimeoutMs());

        AgentConfig config = configService.getOne(
            new QueryWrapper<AgentConfig>().eq("config_key", ARK_CONFIG_KEY));
        if (config != null && config.getConfigData() != null && !config.getConfigData().isEmpty()) {
            try {
                JSONObject json = JSONUtil.parseObj(config.getConfigData());
                result.setBaseUrl(json.getStr("baseUrl", result.getBaseUrl()));
                result.setApiKey(json.getStr("apiKey", result.getApiKey()));
                result.setEnvironmentId(json.getStr("environmentId", result.getEnvironmentId()));
                result.setDefaultModelId(json.getStr("defaultModelId", result.getDefaultModelId()));
                result.setDefaultAgentId(json.getStr("defaultAgentId", result.getDefaultAgentId()));
                result.setConnectTimeoutMs(json.getInt("connectTimeoutMs", result.getConnectTimeoutMs()));
                result.setReadTimeoutMs(json.getInt("readTimeoutMs", result.getReadTimeoutMs()));
            } catch (Exception e) {
                log.warn("Failed to parse ark provider config from DB, using fallback: {}", e.getMessage());
            }
        }
        return result;
    }

    /**
     * 自研引擎（OpenAI 兼容）连接配置。
     * 优先读 {@code provider_config:openai-compatible}；未配置时回退现有
     * {@code llm_config} / yml —— 存量部署行为不变。
     */
    public AgentModelConfigService.LlmConfig getOpenAiCompatibleConfig() {
        AgentModelConfigService.LlmConfig llm = modelConfigService.getLlmConfig();
        AgentConfig config = configService.getOne(
            new QueryWrapper<AgentConfig>().eq("config_key", OPENAI_COMPATIBLE_CONFIG_KEY));
        if (config != null && config.getConfigData() != null && !config.getConfigData().isEmpty()) {
            try {
                JSONObject json = JSONUtil.parseObj(config.getConfigData());
                llm.setApiHost(json.getStr("apiHost", llm.getApiHost()));
                llm.setApiKey(json.getStr("apiKey", llm.getApiKey()));
                llm.setModel(json.getStr("model", llm.getModel()));
                llm.setTemperature(json.getDouble("temperature", llm.getTemperature()));
                llm.setMaxTokens(json.getInt("maxTokens", llm.getMaxTokens()));
                llm.setContextWindow(json.getInt("contextWindow", llm.getContextWindow()));
            } catch (Exception e) {
                log.warn("Failed to parse openai-compatible provider config from DB, using fallback: {}", e.getMessage());
            }
        }
        return llm;
    }

    /**
     * 默认执行引擎（管理端切换）：'local'（自研，默认）| 'ark'（方舟托管）。
     * 读取 agent.engine.default（configData {"mode":...}，兼容 content 直写 "ark"），异常一律回退 local。
     */
    public String getDefaultEngineMode() {
        try {
            AgentConfig config = configService.getOne(
                new QueryWrapper<AgentConfig>().eq("config_key", DEFAULT_ENGINE_CONFIG_KEY));
            if (config == null) {
                return "local";
            }
            if (config.getConfigData() != null && !config.getConfigData().isEmpty()) {
                String mode = JSONUtil.parseObj(config.getConfigData()).getStr("mode", "local");
                return "ark".equals(mode) ? "ark" : "local";
            }
            if (config.getContent() != null && "ark".equals(config.getContent().trim())) {
                return "ark";
            }
        } catch (Exception e) {
            log.warn("Failed to read default engine mode, fallback to local: {}", e.getMessage());
        }
        return "local";
    }

    /**
     * 方舟三要素（apiKey / environmentId / defaultAgentId）是否齐备 ——
     * 齐备时会话默认运行切换到方舟引擎，否则回退 local。
     */
    public boolean isArkDefaultReady() {
        ArkConfig cfg = getArkConfig();
        return cfg.getApiKey() != null && !cfg.getApiKey().isEmpty()
            && cfg.getEnvironmentId() != null && !cfg.getEnvironmentId().isEmpty()
            && cfg.getDefaultAgentId() != null && !cfg.getDefaultAgentId().isEmpty();
    }

    /**
     * 管理端切换到方舟托管的前置条件：apiKey + environmentId 已配置。
     * （defaultAgentId 可为空 —— 未填时由自动同步创建 ark-assistant 的远端资源。）
     */
    public boolean isArkConfiguredForDefault() {
        ArkConfig cfg = getArkConfig();
        return cfg.getApiKey() != null && !cfg.getApiKey().isEmpty()
            && cfg.getEnvironmentId() != null && !cfg.getEnvironmentId().isEmpty();
    }

    /** 方舟托管连接配置（不可变快照） */
    @lombok.Data
    public static class ArkConfig {
        private String baseUrl;
        private String apiKey;
        private String environmentId;
        private String defaultModelId;
        private String defaultAgentId;
        private int connectTimeoutMs;
        private int readTimeoutMs;
    }
}
