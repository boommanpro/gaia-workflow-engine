package cn.boommanpro.gaia.workflow.base.event;

import cn.boommanpro.gaia.workflow.base.model.Chain;
import cn.boommanpro.gaia.workflow.base.model.ChainNode;

import java.util.Map;

/**
 * 节点执行错误事件
 *
 * @author <a href="mailto:boommanpro@gmail.com">boommanpro</a>
 * @date 2025/08/22
 */
public class NodeErrorEvent extends BaseChainEvent {

    private final ChainNode node;
    private final Throwable error;
    private final Map<String, Object> nodeResult;

    public NodeErrorEvent(Chain chain, ChainNode node, Throwable error, Map<String, Object> nodeResult) {
        super(chain);
        this.node = node;
        this.error = error;
        this.nodeResult = nodeResult;
    }

    public ChainNode getNode() {
        return node;
    }

    public Throwable getError() {
        return error;
    }

    public Map<String, Object> getNodeResult() {
        return nodeResult;
    }

    @Override
    public String toString() {
        return "NodeErrorEvent{" +
                "chainId=" + (chain != null ? chain.getId() : "null") +
                ", nodeId=" + (node != null ? node.getId() : "null") +
                ", error=" + error +
                ", nodeResult=" + nodeResult +
                ", timestamp=" + timestamp +
                '}';
    }
}

