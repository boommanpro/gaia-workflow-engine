package cn.boommanpro.gaia.workflow.base.event;

import cn.boommanpro.gaia.workflow.base.model.Chain;
import cn.boommanpro.gaia.workflow.base.model.ChainNode;

import java.util.Map;

/**
 * 节点执行结束事件
 *
 * @author <a href="mailto:boommanpro@gmail.com">boommanpro</a>
 * @date 2025/08/22
 */
public class NodeEndEvent extends BaseChainEvent {

    private final ChainNode node;
    private final Map<String, Object> executeResult;

    public NodeEndEvent(Chain chain, ChainNode node, Map<String, Object> executeResult) {
        super(chain);
        this.node = node;
        this.executeResult = executeResult;
    }

    public ChainNode getNode() {
        return node;
    }

    public Map<String, Object> getExecuteResult() {
        return executeResult;
    }

    @Override
    public String toString() {
        return "NodeEndEvent{" +
                "chainId=" + (chain != null ? chain.getId() : "null") +
                ", nodeId=" + (node != null ? node.getId() : "null") +
                ", executeResult=" + executeResult +
                ", timestamp=" + timestamp +
                '}';
    }
}

