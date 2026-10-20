package cn.boommanpro.gaia.workflow.app.service;

import cn.boommanpro.gaia.workflow.app.config.AgentProperties;
import cn.boommanpro.gaia.workflow.infra.manage.entity.AgentConfig;
import cn.boommanpro.gaia.workflow.infra.manage.entity.AgentSession;
import cn.boommanpro.gaia.workflow.infra.manage.entity.LlmModel;
import cn.boommanpro.gaia.workflow.infra.manage.service.AgentConfigService;
import cn.boommanpro.gaia.workflow.infra.manage.service.AgentSessionService;
import cn.boommanpro.gaia.workflow.infra.manage.service.LlmModelService;
import cn.hutool.json.JSONObject;
import cn.hutool.json.JSONUtil;
import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

/**
 * 模型配置服务 — 数据库优先，application.yml 兜底
 *
 * <p>数据库中 agent_config 表 configKey={@link #LLM_CONFIG_KEY} 的 config_data 字段
 * 存储完整 JSON 配置，修改后即时生效（无缓存），全局影响执行引擎 / SubagentService。
 */
@Slf4j
@Service
public class AgentModelConfigService {

    public static final String LLM_CONFIG_KEY = "llm_config";
    /** 全局默认模型（llm_model.id）；空 = 走旧 llm_config/yml 链路 */
    public static final String ACTIVE_MODEL_KEY = "model.active";

    private final AgentConfigService configService;
    private final AgentProperties properties;
    private final LlmModelService llmModelService;
    private final AgentSessionService sessionService;
    private final ThinkingParamPlanner thinkingPlanner;

    public AgentModelConfigService(AgentConfigService configService, AgentProperties properties,
                                   LlmModelService llmModelService, AgentSessionService sessionService,
                                   ThinkingParamPlanner thinkingPlanner) {
        this.configService = configService;
        this.properties = properties;
        this.llmModelService = llmModelService;
        this.sessionService = sessionService;
        this.thinkingPlanner = thinkingPlanner;
    }

    /** 会话级模型解析：会话绑定 > 全局默认（llm_model 条目）> 旧 llm_config/yml 兜底 */
    public LlmConfig getLlmConfig(String sessionKey) {
        Long modelId = null;
        if (sessionKey != null && !sessionKey.isEmpty()) {
            AgentSession session = sessionService.getOne(
                new QueryWrapper<AgentSession>().eq("session_key", sessionKey).last("LIMIT 1"));
            if (session != null) {
                modelId = session.getModelId();
            }
        }
        if (modelId == null) {
            modelId = getActiveModelId();
        }
        if (modelId != null) {
            LlmModel entry = llmModelService.getById(modelId);
            if (entry != null && entry.getEnabled() != null && entry.getEnabled() == 1) {
                return fromEntry(entry, sessionKey);
            }
            // 指向的模型被删/禁用：明确降级到全局链路（日志可见），不静默假装
            log.warn("[model-resolver] session={} bound model {} missing/disabled, falling back to global",
                sessionKey, modelId);
        }
        return getLlmConfig();
    }

    /** 全局默认模型 id（llm_model 表）；未设置返回 null */
    public Long getActiveModelId() {
        AgentConfig config = configService.getOne(
            new QueryWrapper<AgentConfig>().eq("config_key", ACTIVE_MODEL_KEY));
        if (config != null && config.getContent() != null && !config.getContent().isEmpty()) {
            try {
                return Long.parseLong(config.getContent().trim());
            } catch (NumberFormatException ignore) {
                // 旧格式或脏数据
            }
        }
        return null;
    }

    public void setActiveModelId(Long modelId) {
        AgentConfig config = configService.getOne(
            new QueryWrapper<AgentConfig>().eq("config_key", ACTIVE_MODEL_KEY));
        String now = java.time.LocalDateTime.now().toString();
        if (config == null) {
            config = new AgentConfig();
            config.setConfigKey(ACTIVE_MODEL_KEY);
            config.setConfigType("model_setting");
            config.setTitle("全局默认模型");
            config.setCreatedAt(now);
            config.setUpdatedAt(now);
            config.setContent(modelId != null ? String.valueOf(modelId) : "");
            configService.save(config);
        } else {
            config.setContent(modelId != null ? String.valueOf(modelId) : "");
            config.setUpdatedAt(now);
            configService.updateById(config);
        }
    }

    /** llm_model 条目 → 运行时配置（含思考参数解析） */
    private LlmConfig fromEntry(LlmModel entry, String sessionKey) {
        LlmConfig result = new LlmConfig();
        result.setApiHost(entry.getBaseUrl());
        result.setApiKey(entry.getApiKey());
        result.setModel(entry.getModelId());
        // temperature/maxTokens/contextWindow：条目缺省时沿用平台默认（yml）
        result.setTemperature(entry.getTemperature() != null
            ? entry.getTemperature() : properties.getLlm().getTemperature());
        result.setMaxTokens(entry.getMaxTokens() != null
            ? entry.getMaxTokens() : properties.getLlm().getMaxTokens());
        result.setContextWindow(entry.getContextWindow() != null && entry.getContextWindow() > 0
            ? entry.getContextWindow() : properties.getLlm().getContextWindow());
        String level = entry.getThinkingOverride() != null && !entry.getThinkingOverride().isEmpty()
            ? entry.getThinkingOverride() : globalThinkingLevel();
        ThinkingParamPlanner.Plan plan = thinkingPlanner.plan(
            entry.getVendor(), entry.getModelId(), level);
        result.setThinkingLevel(plan.level);
        result.setThinkingSupported(plan.supported);
        result.setThinkingBudgetTokens(plan.budgetTokens);
        result.setReasoningEffort(plan.reasoningEffort);
        result.setThinkingNote(plan.note);
        if (entry.getExtraBody() != null && !entry.getExtraBody().isEmpty()) {
            try {
                // 逃生口：extra_body 是厂商私有参数的最终覆盖（语义上高于推导参数）
                result.setChatTemplateKwargs(JSONUtil.parseObj(entry.getExtraBody()));
            } catch (Exception e) {
                log.warn("[model-resolver] extra_body parse failed for {}: {}", entry.getDisplayName(), e.getMessage());
            }
        }
        return result;
    }

    /** 全局思考档位（agent_config model.thinking；缺省 auto） */
    public String globalThinkingLevel() {
        AgentConfig config = configService.getOne(
            new QueryWrapper<AgentConfig>().eq("config_key", "model.thinking"));
        if (config != null && config.getContent() != null && !config.getContent().isEmpty()) {
            return config.getContent().trim();
        }
        return ThinkingParamPlanner.AUTO;
    }

    public void setGlobalThinkingLevel(String level) {
        AgentConfig config = configService.getOne(
            new QueryWrapper<AgentConfig>().eq("config_key", "model.thinking"));
        String now = java.time.LocalDateTime.now().toString();
        if (config == null) {
            config = new AgentConfig();
            config.setConfigKey("model.thinking");
            config.setConfigType("model_setting");
            config.setTitle("全局思考档位");
            config.setCreatedAt(now);
            config.setUpdatedAt(now);
            config.setContent(level);
            configService.save(config);
        } else {
            config.setContent(level);
            config.setUpdatedAt(now);
            configService.updateById(config);
        }
    }

    /** 全局历史压缩阈值（agent_config model.compaction，窗口百分比；缺省走 yml run.compaction-threshold-percent） */
    public int globalCompactionThreshold() {
        AgentConfig config = configService.getOne(
            new QueryWrapper<AgentConfig>().eq("config_key", "model.compaction"));
        if (config != null && config.getContent() != null && !config.getContent().isEmpty()) {
            try {
                int percent = Integer.parseInt(config.getContent().trim());
                if (percent >= 10 && percent <= 95) {
                    return percent;
                }
            } catch (NumberFormatException ignore) {
                // 脏数据回退默认
            }
        }
        return properties.getRun().getCompactionThresholdPercent();
    }

    public void setGlobalCompactionThreshold(int percent) {
        AgentConfig config = configService.getOne(
            new QueryWrapper<AgentConfig>().eq("config_key", "model.compaction"));
        String now = java.time.LocalDateTime.now().toString();
        if (config == null) {
            config = new AgentConfig();
            config.setConfigKey("model.compaction");
            config.setConfigType("model_setting");
            config.setTitle("全局历史压缩阈值");
            config.setCreatedAt(now);
            config.setUpdatedAt(now);
            config.setContent(String.valueOf(percent));
            configService.save(config);
        } else {
            config.setContent(String.valueOf(percent));
            config.setUpdatedAt(now);
            configService.updateById(config);
        }
    }

    /**
     * 获取当前生效的 LLM 配置（DB 优先 → yml 默认值兜底）
     */
    public LlmConfig getLlmConfig() {
        AgentConfig config = configService.getOne(
                new QueryWrapper<AgentConfig>().eq("config_key", LLM_CONFIG_KEY));
        if (config != null && config.getConfigData() != null && !config.getConfigData().isEmpty()) {
            try {
                JSONObject json = JSONUtil.parseObj(config.getConfigData());
                LlmConfig result = new LlmConfig();
                result.setApiHost(json.getStr("apiHost", properties.getLlm().getApiHost()));
                result.setApiKey(json.getStr("apiKey", properties.getLlm().getApiKey()));
                result.setModel(json.getStr("model", properties.getLlm().getModel()));
                result.setTemperature(json.getDouble("temperature", properties.getLlm().getTemperature()));
                result.setMaxTokens(json.getInt("maxTokens", properties.getLlm().getMaxTokens()));
                result.setContextWindow(json.getInt("contextWindow", properties.getLlm().getContextWindow()));
                // 透传 chat_template_kwargs（如 {"enable_thinking":false} 关闭本地模型的思考模式，
                // 思考会拖慢工具调用并挤占生成预算）。仅显式配置时发送，避免不兼容服务报错。
                result.setChatTemplateKwargs(json.getJSONObject("chatTemplateKwargs"));
                return result;
            } catch (Exception e) {
                log.warn("Failed to parse LLM config from DB, falling back to yml defaults: {}", e.getMessage());
            }
        }
        // yml 兜底
        LlmConfig result = new LlmConfig();
        result.setApiHost(properties.getLlm().getApiHost());
        result.setApiKey(properties.getLlm().getApiKey());
        result.setModel(properties.getLlm().getModel());
        result.setTemperature(properties.getLlm().getTemperature());
        result.setMaxTokens(properties.getLlm().getMaxTokens());
        result.setContextWindow(properties.getLlm().getContextWindow());
        return result;
    }

    /**
     * 运行时 LLM 配置（不可变快照）
     */
    @lombok.Data
    public static class LlmConfig {
        private String apiHost;
        private String apiKey;
        private String model;
        private double temperature;
        private int maxTokens;
        private int contextWindow;
        /** 透传给 /chat/completions 的 chat_template_kwargs（可空） */
                /** 透传 chat_template_kwargs（如 {"enable_thinking":false} 关闭本地模型的思考模式，
        思考会拖慢工具调用并挤占生成预算）。仅显式配置时发送，避免不兼容服务报错。 */
        private JSONObject chatTemplateKwargs;
        /** 思考档位（解析后的实际档位） */
        private String thinkingLevel;
        /** 该模型是否支持思考参数 */
        private boolean thinkingSupported = true;
        /** 思考预算（AgentScope GenerateOptions.thinkingBudget；null=不下发） */
        private Integer thinkingBudgetTokens;
        /** 推理努力档（AgentScope GenerateOptions.reasoningEffort；null=不下发） */
        private String reasoningEffort;
        /** 思考参数说明（不支持/关不到零等，前端展示） */
        private String thinkingNote;
    }
}
