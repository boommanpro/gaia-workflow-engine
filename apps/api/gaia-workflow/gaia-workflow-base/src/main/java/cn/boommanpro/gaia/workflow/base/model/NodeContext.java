package cn.boommanpro.gaia.workflow.base.model;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * 节点执行上下文
 * 记录节点的触发和执行信息
 *
 * @author <a href="mailto:boommanpro@gmail.com">boommanpro</a>
 * @date 2025/08/22
 */
public class NodeContext {

    public ChainNode currentNode;
    public ChainNode prevNode;
    public String fromEdgeId;

    private AtomicInteger triggerCount = new AtomicInteger(0);
    private List<String> triggerEdgeIds = new ArrayList<>();

    private AtomicInteger executeCount = new AtomicInteger(0);
    private List<String> executeEdgeIds = new ArrayList<>();

    public ChainNode getCurrentNode() {
        return currentNode;
    }

    public ChainNode getPrevNode() {
        return prevNode;
    }

    public String getFromEdgeId() {
        return fromEdgeId;
    }

    public int getTriggerCount() {
        return triggerCount.get();
    }

    public List<String> getTriggerEdgeIds() {
        return triggerEdgeIds;
    }

    public int getExecuteCount() {
        return executeCount.get();
    }

    public List<String> getExecuteEdgeIds() {
        return executeEdgeIds;
    }

    public boolean isUpstreamFullyExecuted() {
        List<ChainEdge> inwardEdges = currentNode.getInwardEdges();
        if (inwardEdges == null || inwardEdges.isEmpty()) {
            return true;
        }

        List<String> shouldBeTriggerIds = new ArrayList<>();
        for (ChainEdge edge : inwardEdges) {
            shouldBeTriggerIds.add(edge.getId());
        }

        return triggerEdgeIds.size() >= shouldBeTriggerIds.size()
            && shouldBeTriggerIds.stream().allMatch(triggerEdgeIds::contains);
    }

    public void recordTrigger(Chain.ExecuteNode executeNode) {
        this.currentNode = executeNode.currentNode;
        this.prevNode = executeNode.prevNode;
        this.fromEdgeId = executeNode.fromEdgeId;

        triggerCount.incrementAndGet();
        triggerEdgeIds.add(executeNode.fromEdgeId);
    }

    public synchronized void recordExecute(Chain.ExecuteNode executeNode) {
        executeCount.incrementAndGet();
        executeEdgeIds.add(executeNode.fromEdgeId);
    }
}

