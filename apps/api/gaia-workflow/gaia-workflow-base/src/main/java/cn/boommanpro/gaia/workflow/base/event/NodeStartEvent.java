package cn.boommanpro.gaia.workflow.base.event;

import cn.boommanpro.gaia.workflow.base.model.Chain;
import cn.boommanpro.gaia.workflow.base.model.ChainNode;

/**
 * 节点开始执行事件
 *
 * @author <a href="mailto:boommanpro@gmail.com">boommanpro</a>
 * @date 2025/08/22
 */
public class NodeStartEvent extends BaseChainEvent {

    private final ChainNode node;

    public NodeStartEvent(Chain chain, ChainNode node) {
        super(chain);
        this.node = node;
    }

    public ChainNode getNode() {
        return node;
    }

    @Override
    public String toString() {
        return "NodeStartEvent{" +
                "chainId=" + (chain != null ? chain.getId() : "null") +
                ", nodeId=" + (node != null ? node.getId() : "null") +
                ", timestamp=" + timestamp +
                '}';
    }
}

