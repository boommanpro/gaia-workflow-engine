package cn.boommanpro.gaia.workflow.app.agent.core;

/**
 * 可被 {@link AgentRegistry} 管理的 Agent（策略模式中的 Strategy）。
 *
 * <p>Agent 自身不实现推理循环，它只回答三件事：</p>
 * <ol>
 *   <li>我是谁 —— {@link #getDefinition()}，声明式的全部配置</li>
 *   <li>我能处理什么请求 —— {@link #supports(AgentRequest)}</li>
 *   <li>如何执行 —— 交给统一的 {@code AgentRuntime} 按定义编排</li>
 * </ol>
 *
 * <p>把「行为」从 if-else 分支里挪到这里，新增一种 Agent 只需
 * 注册一个新的 {@link AgentDefinition}，无需改动运行时代码（开闭原则）。</p>
 */
public interface Agent {

    /** Agent 唯一 id，与 AgentDefinition.id 一致 */
    String getId();

    /** 该 Agent 的声明式定义 */
    AgentDefinition getDefinition();

    /**
     * 是否可以处理该请求。
     * 默认实现只判断启用状态；子类可以叠加关键词、路由、能力等条件。
     */
    default boolean supports(AgentRequest request) {
        return getDefinition().isEnabled();
    }
}
