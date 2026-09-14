package cn.boommanpro.gaia.workflow.app.agent.core;

import lombok.AllArgsConstructor;

/**
 * 由 {@link AgentDefinition} 直接构造的 Agent（工厂产物的默认形态）。
 *
 * <p>绝大多数 Agent 不需要写 Java 代码 —— 只要有一份定义，
 * 运行时就能按定义把它装配出来。</p>
 */
@AllArgsConstructor
public class DefinitionBasedAgent implements Agent {

    private final AgentDefinition definition;

    @Override
    public String getId() {
        return definition.getId();
    }

    @Override
    public AgentDefinition getDefinition() {
        return definition;
    }
}
