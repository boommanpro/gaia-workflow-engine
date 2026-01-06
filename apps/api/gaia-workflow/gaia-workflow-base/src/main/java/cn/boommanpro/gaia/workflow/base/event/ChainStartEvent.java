package cn.boommanpro.gaia.workflow.base.event;

import cn.boommanpro.gaia.workflow.base.model.Chain;

import java.util.Map;

/**
 * 链开始执行事件
 *
 * @author <a href="mailto:boommanpro@gmail.com">boommanpro</a>
 * @date 2025/08/22
 */
public class ChainStartEvent extends BaseChainEvent {

    private final Map<String, Object> variables;

    public ChainStartEvent(Chain chain, Map<String, Object> variables) {
        super(chain);
        this.variables = variables;
    }

    public Map<String, Object> getVariables() {
        return variables;
    }

    @Override
    public String toString() {
        return "ChainStartEvent{" +
                "chainId=" + (chain != null ? chain.getId() : "null") +
                ", variables=" + variables +
                ", timestamp=" + timestamp +
                '}';
    }
}

