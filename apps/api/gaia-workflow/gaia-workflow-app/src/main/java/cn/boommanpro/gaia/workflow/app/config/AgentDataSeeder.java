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
                int modelCount = seedModelConfig();
            // 确保工具定义已播种（@PostConstruct 时机可能早于 schema.sql 执行）
            toolRegistry.ensureSeeded();
            log.info("Agent seed data check complete: modelConfig={}", modelCount);
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
}
