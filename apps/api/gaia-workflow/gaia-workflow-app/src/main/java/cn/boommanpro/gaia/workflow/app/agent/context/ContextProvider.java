package cn.boommanpro.gaia.workflow.app.agent.context;

import cn.boommanpro.gaia.workflow.app.agent.core.AgentRunContext;

/**
 * 上下文提供者（策略模式）。
 *
 * <p>改造前上下文注入是 {@code streamLlm} 里按顺序硬写的一段死代码：
 * 节点知识库 → RAG → 知识图谱 → 模板列表，加一种上下文就要改那个方法。</p>
 *
 * <p>现在每种上下文本质是一个独立策略：自己决定适不适用、自己决定怎么产出。
 * 运行时通过 {@link ContextProviderRegistry} 收集并按 {@link #order()} 排序装配。</p>
 */
public interface ContextProvider {

    /** 唯一 id，AgentDefinition.contextProviderIds 引用它 */
    String id();

    /** 装配顺序，越小越靠前（越靠前越靠近系统提示词，模型越重视） */
    int order();

    /** 是否启用 */
    default boolean enabled() {
        return true;
    }

    /** 展示名 */
    default String name() {
        return id();
    }

    /**
     * 在当前上下文是否需要注入。
     * 默认实现会跳过无头模式下的前端专属上下文。
     */
    default boolean supports(AgentRunContext context) {
        return true;
    }

    /**
     * 产出上下文文本，返回 null 表示本次不注入。
     * 实现必须保证不抛出受检异常，失败应自行降级返回 null。
     */
    String build(AgentRunContext context);
}
