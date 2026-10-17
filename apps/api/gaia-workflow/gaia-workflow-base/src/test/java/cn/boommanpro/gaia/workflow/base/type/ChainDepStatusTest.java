package cn.boommanpro.gaia.workflow.base.type;

import cn.boommanpro.gaia.workflow.base.model.Chain;
import cn.boommanpro.gaia.workflow.base.model.ChainEdge;
import cn.boommanpro.gaia.workflow.base.model.ChainNode;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.Collections;

import static org.junit.jupiter.api.Assertions.assertEquals;

/**
 * 引擎边语义核心单测（钉住调度真相，防止回归）：
 * <ul>
 *   <li>无入边 → READY（可执行）</li>
 *   <li>任一入边 READY（未执行完）→ WAIT</li>
 *   <li>全部入边 SKIPPED/FALSE → SKIPPED（OR-join 语义：任一 TRUE 即执行）</li>
 *   <li>混有 TRUE → READY（TRUE/FALSE 边都会触发下游计算，下游按入边状态决定是否真执行）</li>
 * </ul>
 */
@DisplayName("ChainDepStatus 边语义")
class ChainDepStatusTest {

    /** 测试桩：ChainNode 是抽象类，调度语义测试只关心入边状态 */
    private static class StubNode extends ChainNode {
        @Override
        public java.util.Map<String, Object> execute(Chain chain) {
            return java.util.Collections.emptyMap();
        }
    }

    private static ChainNode nodeWith(ChainEdgeStatus... statuses) {
        ChainNode node = new StubNode();
        java.util.List<ChainEdge> edges = new java.util.ArrayList<>();
        for (ChainEdgeStatus status : statuses) {
            ChainEdge edge = new ChainEdge();
            edge.setStatus(status);
            edges.add(edge);
        }
        node.setInwardEdges(edges);
        return node;
    }

    @Test
    @DisplayName("无入边 → READY")
    void noEdgesIsReady() {
        ChainNode node = new StubNode();
        node.setInwardEdges(Collections.emptyList());
        assertEquals(ChainDepStatus.READY, ChainDepStatus.calcChainNodeDep(node));
    }

    @Test
    @DisplayName("任一入边 READY → WAIT（上游未完成）")
    void readyEdgeMeansWait() {
        assertEquals(ChainDepStatus.WAIT, ChainDepStatus.calcChainNodeDep(
            nodeWith(ChainEdgeStatus.TRUE, ChainEdgeStatus.READY)));
    }

    @Test
    @DisplayName("全部入边 FALSE/SKIPPED → SKIPPED（该节点不执行）")
    void allFalseOrSkippedMeansSkipped() {
        assertEquals(ChainDepStatus.SKIPPED, ChainDepStatus.calcChainNodeDep(
            nodeWith(ChainEdgeStatus.FALSE, ChainEdgeStatus.SKIPPED)));
    }

    @Test
    @DisplayName("混有 TRUE 边 → READY（OR-join：一条真边即激活）")
    void trueEdgeActivatesJoin() {
        assertEquals(ChainDepStatus.READY, ChainDepStatus.calcChainNodeDep(
            nodeWith(ChainEdgeStatus.FALSE, ChainEdgeStatus.TRUE)));
        assertEquals(ChainDepStatus.READY, ChainDepStatus.calcChainNodeDep(
            nodeWith(ChainEdgeStatus.TRUE)));
    }
}
