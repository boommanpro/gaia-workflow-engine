package cn.boommanpro.gaia.workflow.app.agent.runtime;

import cn.boommanpro.gaia.workflow.app.agent.core.AgentDefinition;
import cn.boommanpro.gaia.workflow.app.service.AgentToolRegistry;
import cn.boommanpro.gaia.workflow.infra.manage.entity.AgentConfig;
import cn.boommanpro.gaia.workflow.infra.manage.service.AgentConfigService;
import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

/**
 * 系统提示词解析器（策略模式 + 三级兜底）。
 *
 * <p>按 Agent 解析，优先级：</p>
 * <ol>
 *   <li>AgentDefinition 里直接写死的 systemPrompt</li>
 *   <li>AgentDefinition 指定的配置中心 key（systemPromptConfigKey，如 workflow-architect 人设）</li>
 *   <li>默认提示词：AgentPromptComposer 按 identity/soul/agents 组装（agent_prompt_config 覆盖、classpath 兜底）</li>
 * </ol>
 *
 * 这样在管理后台改提示词即刻生效，也能给不同 Agent 配不同人格。
 */
@Slf4j
@Component
public class SystemPromptResolver {

    private final AgentToolRegistry toolSchemaRegistry;
    private final AgentConfigService configService;

    public SystemPromptResolver(AgentToolRegistry toolSchemaRegistry, AgentConfigService configService) {
        this.toolSchemaRegistry = toolSchemaRegistry;
        this.configService = configService;
    }

    public String resolve(AgentDefinition definition, String locale) {
        if (definition == null) {
            return defaultPrompt(null, locale);
        }
        if (definition.getSystemPrompt() != null && !definition.getSystemPrompt().trim().isEmpty()) {
            return definition.getSystemPrompt();
        }
        if (definition.getSystemPromptConfigKey() != null && !definition.getSystemPromptConfigKey().isEmpty()) {
            String byKey = loadFromConfig(definition.getSystemPromptConfigKey(), locale);
            if (byKey != null) {
                // DB 提示词也要注入知识目录（skill 目录等价物）—— 否则默认 agent 看不到知识清单
                return toolSchemaRegistry.injectKnowledgeCatalog(byKey);
            }
        }
        return defaultPrompt(definition.getToolNames(), locale);
    }

    private String defaultPrompt(java.util.Set<String> toolNames, String locale) {
        // 默认提示词 = 组装正文 + 按启用状态动态渲染的工具目录（目录随定义的工具集过滤）
        return toolSchemaRegistry.getSystemPrompt(locale, toolNames);
    }

    private String loadFromConfig(String configKey, String locale) {
        String key = configKey;
        if (locale != null && locale.startsWith("en") && !configKey.endsWith(".en")) {
            String enKey = configKey + ".en";
            AgentConfig en = queryConfig(enKey);
            if (en != null) {
                return en.getContent();
            }
        }
        AgentConfig config = queryConfig(key);
        return config != null ? config.getContent() : null;
    }

    private AgentConfig queryConfig(String configKey) {
        try {
            return configService.getOne(
                new QueryWrapper<AgentConfig>().eq("config_key", configKey).last("LIMIT 1"));
        } catch (Exception e) {
            log.warn("[prompt-resolver] query config '{}' failed: {}", configKey, e.getMessage());
            return null;
        }
    }
}
