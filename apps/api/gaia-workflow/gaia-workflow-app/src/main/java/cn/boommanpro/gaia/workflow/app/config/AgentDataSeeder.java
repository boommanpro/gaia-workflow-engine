package cn.boommanpro.gaia.workflow.app.config;

import cn.boommanpro.gaia.workflow.infra.manage.entity.AgentConfig;
import cn.boommanpro.gaia.workflow.infra.manage.service.AgentConfigService;
import cn.boommanpro.gaia.workflow.app.service.AgentToolRegistry;
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

    private final AgentConfigService configService;
    private final AgentToolRegistry toolRegistry;
    private final AgentProperties properties;

    public AgentDataSeeder(AgentConfigService configService,
                           AgentToolRegistry toolRegistry,
                           AgentProperties properties) {
        this.configService = configService;
        this.toolRegistry = toolRegistry;
        this.properties = properties;
    }

    @Override
    public void run(ApplicationArguments args) {
        try {
            cleanupRetiredConfigKeys();
            int modelCount = seedModelConfig();
            // 确保工具定义已播种（@PostConstruct 时机可能早于 schema.sql 执行）
            toolRegistry.ensureSeeded();
            log.info("Agent seed data check complete: modelConfig={}", modelCount);
        } catch (Exception e) {
            log.warn("Agent seed data initialization failed: {}", e.getMessage(), e);
        }
    }

    /**
     * 已下线功能的配置清理（幂等，无则空过）：
     * 权限策略 / embedding 向量检索 / 默认系统提示词的 agent_config 副本（已迁 agent_prompt_config）
     * / 节点知识文档（已迁 agent_skill_file）。
     */
    private void cleanupRetiredConfigKeys() {
        String[] retiredKeys = {
            "agent.policy.confirm_mode", "agent.policy.apply_confirm_mode", "embedding_config",
            "system_prompt.default", "system_prompt.default.en",
            "agent.prompt.imported_hash.system_prompt.default",
            "agent.prompt.imported_hash.system_prompt.default.en"};
        long deleted = 0;
        for (String key : retiredKeys) {
            QueryWrapper<AgentConfig> byKey = new QueryWrapper<AgentConfig>().eq("config_key", key);
            long cnt = configService.count(byKey);
            if (cnt > 0) {
                configService.remove(byKey);
                deleted += cnt;
            }
        }
        QueryWrapper<AgentConfig> nodeKnowledge = new QueryWrapper<AgentConfig>().eq("config_type", "node_knowledge");
        long nodeKnowledgeCount = configService.count(nodeKnowledge);
        if (nodeKnowledgeCount > 0) {
            configService.remove(nodeKnowledge);
            deleted += nodeKnowledgeCount;
        }
        if (deleted > 0) {
            log.info("Cleaned up {} retired agent_config entries", deleted);
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
}
