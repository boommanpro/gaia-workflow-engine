package cn.boommanpro.gaia.workflow.base.model;

import cn.boommanpro.gaia.workflow.base.GaiaWorkflow;
import cn.boommanpro.gaia.workflow.base.exception.ChainException;
import cn.boommanpro.gaia.workflow.base.node.ChainParser;
import cn.boommanpro.gaia.workflow.base.type.ChainNodeStatus;
import cn.boommanpro.gaia.workflow.base.type.ChainStatus;
import cn.hutool.json.JSONArray;
import cn.hutool.json.JSONObject;
import org.junit.jupiter.api.Test;

import java.util.Collections;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

/**
 * 失败语义传播（第一档 A）：
 * 节点抛异常 → 该节点 FAILED、下游级联 SKIPPED（不再停留 READY）、
 * 工作流终态 FINISHED_ABNORMAL、executeForResult 抛 ChainException。
 * 旧行为：FAILED 节点下游不推进也不标记，报告里像"凭空消失"。
 */
class ChainFailedPropagationTest {

    private static ChainNode okNode(final String nodeId) {
        ChainNode node = new ChainNode() {
            @Override
            public Map<String, Object> execute(Chain chain) {
                return Collections.singletonMap(nodeId, "ok");
            }
        };
        node.setId(nodeId);
        return node;
    }

    private static ChainNode boomNode(String nodeId) {
        ChainNode node = new ChainNode() {
            @Override
            public Map<String, Object> execute(Chain chain) {
                throw new RuntimeException("boom: 模拟 LLM/HTTP 不可达");
            }
        };
        node.setId(nodeId);
        return node;
    }

    /** n1(ok) → n2(boom) → n3(ok) → n4(ok) */
    private Chain buildLinearBoomChain() {
        String ok = "test-ok-" + System.nanoTime();
        String boom = "test-boom-" + System.nanoTime();
        ChainParser.registerNodeParser(ok, (nodeJSONObject, workflow) -> okNode(nodeJSONObject.getStr("id")));
        ChainParser.registerNodeParser(boom, (nodeJSONObject, workflow) -> boomNode(nodeJSONObject.getStr("id")));

        JSONArray nodes = new JSONArray();
        nodes.add(node("n1", ok));
        nodes.add(node("n2", boom));
        nodes.add(node("n3", ok));
        nodes.add(node("n4", ok));
        JSONArray edges = new JSONArray();
        edges.add(edge("n1", "n2"));
        edges.add(edge("n2", "n3"));
        edges.add(edge("n3", "n4"));
        return new ChainParser().parse(nodes, edges, new GaiaWorkflow("{}"));
    }

    private static JSONObject node(String id, String type) {
        return new JSONObject().set("id", id).set("type", type);
    }

    private static JSONObject edge(String from, String to) {
        return new JSONObject().set("sourceNodeID", from).set("targetNodeID", to);
    }

    private static ChainNode statusOf(Chain chain, String id) {
        return chain.getNodes().stream().filter(n -> n.getId().equals(id)).findFirst().orElseThrow();
    }

    @Test
    void failedNodeShouldCascadeSkipDownstreamAndFailWorkflow() {
        Chain chain = buildLinearBoomChain();

        assertThrows(ChainException.class, () -> chain.executeForResult(Collections.emptyMap()));

        assertEquals(ChainNodeStatus.FINISHED, statusOf(chain, "n1").getStatus());
        assertEquals(ChainNodeStatus.FAILED, statusOf(chain, "n2").getStatus());
        assertEquals(ChainNodeStatus.SKIPPED, statusOf(chain, "n3").getStatus(),
            "失败节点的直接下游应标记 SKIPPED");
        assertEquals(ChainNodeStatus.SKIPPED, statusOf(chain, "n4").getStatus(),
            "跳过应沿链路继续传播");
        assertEquals(ChainStatus.FINISHED_ABNORMAL, chain.getChainStatus());
    }

    @Test
    void ignoreErrorModeShouldStillMarkNodes() {
        Chain chain = buildLinearBoomChain();

        chain.executeForResult(Collections.emptyMap(), true);

        assertEquals(ChainNodeStatus.FAILED, statusOf(chain, "n2").getStatus());
        assertEquals(ChainNodeStatus.SKIPPED, statusOf(chain, "n3").getStatus());
    }
}
