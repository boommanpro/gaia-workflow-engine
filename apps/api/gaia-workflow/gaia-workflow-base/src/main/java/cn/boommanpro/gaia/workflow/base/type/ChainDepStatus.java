package cn.boommanpro.gaia.workflow.base.type;

import cn.boommanpro.gaia.workflow.base.model.ChainEdge;
import cn.boommanpro.gaia.workflow.base.model.ChainNode;
import cn.hutool.core.collection.CollectionUtil;
import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public enum ChainDepStatus {
    READY("READY", "准备就绪"),
    SKIPPED("SKIPPED", "跳过"),
    WAIT("WAIT", "等待"),
    ;
    private final String code;
    private final String description;

    public static ChainDepStatus calcChainNodeDep( ChainNode chainNode) {
            //如果没有边，则可以执行
            //如果存在变为READY，则WAIT
            //如果所有边的的状态为跳过，则跳过，否则为READY
            if (CollectionUtil.isEmpty(chainNode.getInwardEdges())) {
                return ChainDepStatus.READY;
            }
            boolean allSkipped = true;
            boolean hasSkipped = false;
            for (ChainEdge edge : chainNode.getInwardEdges()) {
                if (edge.getStatus() == ChainEdgeStatus.READY) {
                    return ChainDepStatus.WAIT;
                }
                if (edge.getStatus() == ChainEdgeStatus.SKIPPED || edge.getStatus() == ChainEdgeStatus.FALSE) {
                    hasSkipped = true;
                    continue;
                }
                allSkipped = false;

            }
            if (allSkipped && hasSkipped) {
                return ChainDepStatus.SKIPPED;
            }
            return ChainDepStatus.READY;
    }
}
