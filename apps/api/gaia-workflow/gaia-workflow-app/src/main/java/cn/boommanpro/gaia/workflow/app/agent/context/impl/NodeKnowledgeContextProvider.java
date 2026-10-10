package cn.boommanpro.gaia.workflow.app.agent.context.impl;

import cn.boommanpro.gaia.workflow.app.agent.context.ContextProvider;
import cn.boommanpro.gaia.workflow.app.agent.core.AgentRunContext;
import cn.boommanpro.gaia.workflow.app.service.AgentKnowledgeService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

/**
 * 节点知识目录上下文提供者（v2 瘦身版）。
 *
 * <p>v1 把全部节点类型的完整文档（数千 token）每轮注入系统提示词——上下文膨胀、
 * 注意力稀释。v2 对齐 dsh 拉模式：这里只注入「类型目录 + 一句话」，
 * 完整字段结构由模型按需调 {@code get_node_schema(nodeType)} 获取。</p>
 */
@Slf4j
@Component
public class NodeKnowledgeContextProvider implements ContextProvider {

    private final AgentKnowledgeService knowledgeService;

    public NodeKnowledgeContextProvider(AgentKnowledgeService knowledgeService) {
        this.knowledgeService = knowledgeService;
    }

    @Override
    public String id() {
        return "node-knowledge";
    }

    @Override
    public String name() {
        return "节点类型目录";
    }

    @Override
    public int order() {
        return 10;
    }

    @Override
    public String build(AgentRunContext context) {
        String catalog = knowledgeService.nodeTypeCatalog();
        if (catalog == null || catalog.isEmpty()) {
            return null;
        }
        return "\n### 可用节点类型目录\n" + catalog
            + "配置任何节点前，用 get_node_schema(nodeType) 获取该类型的完整字段结构与 JSON 示例。\n";
    }
}
