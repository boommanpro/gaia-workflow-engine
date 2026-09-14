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
 * <p>改造前系统只有「一份」写死的系统提示词（prompt-zh.md / prompt-en.md），
 * 所有场景共用，想让某个 Agent 有不同人格只能再往那一堆字里加 if-else。</p>
 *
 * <p>现在按 Agent 解析，优先级：</p>
 * <ol>
 *   <li>AgentDefinition 里直接写死的 systemPrompt</li>
 *   <li>AgentDefinition 指定的配置中心 key（systemPromptConfigKey）</li>
 *   <li>配置中心的默认提示词 system_prompt.default / .en</li>
 * </ol>
 *
 * 这样在管理后台改提示词即刻生效，也能给不同 Agent 配不同人格。
 */
@Slf4j
@Component
public class SystemPromptResolver {

    private static final String DEFAULT_KEY_ZH = "system_prompt.default";
    private static final String DEFAULT_KEY_EN = "system_prompt.default.en";

    private final AgentToolRegistry toolSchemaRegistry;
    private final AgentConfigService configService;

    public SystemPromptResolver(AgentToolRegistry toolSchemaRegistry, AgentConfigService configService) {
        this.toolSchemaRegistry = toolSchemaRegistry;
        this.configService = configService;
    }

    public String resolve(AgentDefinition definition, String locale) {
        if (definition == null) {
            return defaultPrompt(locale);
        }
        if (definition.getSystemPrompt() != null && !definition.getSystemPrompt().trim().isEmpty()) {
            return definition.getSystemPrompt();
        }
        if (definition.getSystemPromptConfigKey() != null && !definition.getSystemPromptConfigKey().isEmpty()) {
            String byKey = loadFromConfig(definition.getSystemPromptConfigKey(), locale);
            if (byKey != null) {
                return byKey;
            }
        }
        return defaultPrompt(locale);
    }

    private String defaultPrompt(String locale) {
        // AgentToolRegistry 已经处理了「DB 优先 + 资源文件兜底 + 页面上下文」逻辑，这里直接复用
        return toolSchemaRegistry.getSystemPrompt(locale, null);
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
