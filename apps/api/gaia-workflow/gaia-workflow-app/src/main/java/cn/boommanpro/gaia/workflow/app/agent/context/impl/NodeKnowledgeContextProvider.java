package cn.boommanpro.gaia.workflow.app.agent.context.impl;

import cn.boommanpro.gaia.workflow.app.agent.context.ContextProvider;
import cn.boommanpro.gaia.workflow.app.agent.core.AgentRunContext;
import cn.boommanpro.gaia.workflow.infra.manage.entity.AgentConfig;
import cn.boommanpro.gaia.workflow.infra.manage.service.AgentConfigService;
import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * 节点知识库上下文提供者。
 *
 * <p>把原先写死在 {@code streamLlm} 里的「加载 node_knowledge 配置并拼进提示词」
 * 抽成独立策略：要不要注入、注入哪些语言版本，都由它自己决定。</p>
 */
@Slf4j
@Component
public class NodeKnowledgeContextProvider implements ContextProvider {

    private final AgentConfigService configService;

    public NodeKnowledgeContextProvider(AgentConfigService configService) {
        this.configService = configService;
    }

    @Override
    public String id() {
        return "node-knowledge";
    }

    @Override
    public String name() {
        return "节点知识库";
    }

    @Override
    public int order() {
        return 10;
    }

    @Override
    public String build(AgentRunContext context) {
        List<AgentConfig> configs = configService.list(
            new QueryWrapper<AgentConfig>().eq("config_type", "node_knowledge"));
        if (configs == null || configs.isEmpty()) {
            return null;
        }

        String suffix = "zh-CN".equals(context.getLocale()) ? "" : ".en";
        StringBuilder builder = new StringBuilder();
        int count = 0;
        for (AgentConfig config : configs) {
            String content = config.getContent();
            if (content == null || content.trim().isEmpty()) {
                continue;
            }
            boolean isEnglishVariant = config.getConfigKey() != null
                && config.getConfigKey().endsWith(".en");
            if (suffix.isEmpty() == isEnglishVariant) {
                continue;
            }
            builder.append("\n### ").append(config.getConfigKey()).append("\n").append(content.trim()).append("\n");
            count++;
        }
        return count == 0 ? null : builder.toString();
    }
}
