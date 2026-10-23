package cn.boommanpro.gaia.workflow.base.model;

import cn.boommanpro.gaia.workflow.base.GaiaWorkflow;
import cn.boommanpro.gaia.workflow.base.node.ChainParser;
import cn.boommanpro.gaia.workflow.base.type.ChainNodeStatus;
import cn.boommanpro.gaia.workflow.base.type.ChainStatus;
import cn.hutool.json.JSONArray;
import cn.hutool.json.JSONObject;
import org.junit.jupiter.api.Test;

import java.util.Collections;
import java.util.Map;
import java.util.concurrent.TimeUnit;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * 协作式取消（第一档 G）：
 * 旧实现 cancelTask 只翻内存状态标志，执行线程毫无感知、跑完还会覆盖状态。
 * 现在 requestCancel 后：运行中节点跑完当前动作（受超时约束），未开始节点
 * 在派发检查点标 CANCELED，整链以 ChainStatus.CANCELED 终结。
 */
class ChainCooperativeCancelTest {

    private static ChainNode okNode(String nodeId) {
        ChainNode node = new ChainNode() {
            @Override
            public Map<String, Object> execute(Chain chain) {
                return Collections.singletonMap(nodeId, "ok");
            }
        };
        node.setId(nodeId);
        return node;
    }

    private static ChainNode slowNode(String nodeId, long sleepMs) {
        ChainNode node = new ChainNode() {
            @Override
            public Map<String, Object> execute(Chain chain) {
                try {
                    Thread.sleep(sleepMs);
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                }
                return Collections.singletonMap(nodeId, "slow-ok");
            }
        };
        node.setId(nodeId);
        return node;
    }

    /** n1(ok) → n2(slow 800ms) → n3(ok) → n4(ok) */
    private Chain buildChain() {
        String ok = "cancel-ok-" + System.nanoTime();
        String slow = "cancel-slow-" + System.nanoTime();
        ChainParser.registerNodeParser(ok, (nodeJSONObject, workflow) -> okNode(nodeJSONObject.getStr("id")));
        ChainParser.registerNodeParser(slow,
            (nodeJSONObject, workflow) -> slowNode(nodeJSONObject.getStr("id"), 800));

        JSONArray nodes = new JSONArray();
        nodes.add(node("n1", ok));
        nodes.add(node("n2", slow));
        nodes.add(node("n3", ok));
        nodes.add(node("n4", ok));
        JSONArray edges = new JSONArray();
        edges.add(edge("n1", "n2"));
        edges.add(edge("n2", "n3"));
        edges.add(edge("n3", "n4"));
        return new ChainParser().parse(nodes, edges, new GaiaWorkflow("{}"));
    }

    private static ChainNode statusOf(Chain chain, String id) {
        return chain.getNodes().stream().filter(n -> n.getId().equals(id)).findFirst().orElseThrow();
    }

    @Test
    void cancelDuringSlowNodeShouldStopDownstream() throws Exception {
        Chain chain = buildChain();
        // 异步启动（编辑器试运行的产品路径）
        chain.executeAsync(Collections.emptyMap());
        // 等 n1 完成、n2（800ms 慢节点）运行中时发起取消
        Thread.sleep(250);
        chain.requestCancel();
        assertTrue(chain.isCancelRequested());

        // waitForCompletion 轮询收敛（等待上限 10s，防悬挂）
        long deadline = System.currentTimeMillis() + 10_000;
        while (System.currentTimeMillis() < deadline) {
            boolean settled = chain.getNodes().stream().noneMatch(n ->
                n.getStatus() == ChainNodeStatus.RUNNING
                    || n.getStatus() == ChainNodeStatus.READY
                    || n.getStatus() == ChainNodeStatus.WAIT);
            if (settled && chain.getChainStatus() == ChainStatus.CANCELED) {
                break;
            }
            TimeUnit.MILLISECONDS.sleep(50);
        }

        assertEquals(ChainStatus.CANCELED, chain.getChainStatus(), "整链终态应为 CANCELED");
        assertEquals(ChainNodeStatus.FINISHED, statusOf(chain, "n1").getStatus());
        // n2 可能已跑完（协作式不硬中断）也可能恰在取消时未开始——两者都是合法取消语义
        ChainNodeStatus n2 = statusOf(chain, "n2").getStatus();
        assertTrue(n2 == ChainNodeStatus.FINISHED || n2 == ChainNodeStatus.CANCELED,
            "运行中的慢节点应跑完或被标记取消，实际: " + n2);
        assertEquals(ChainNodeStatus.CANCELED, statusOf(chain, "n3").getStatus(),
            "未开始的下游节点应标 CANCELED");
        assertEquals(ChainNodeStatus.CANCELED, statusOf(chain, "n4").getStatus(),
            "取消应沿链路传播到所有未开始节点");
    }

    @Test
    void cancelBeforeRunShouldCancelEverything() throws Exception {
        Chain chain = buildChain();
        chain.requestCancel();
        chain.executeAsync(Collections.emptyMap());

        long deadline = System.currentTimeMillis() + 10_000;
        while (System.currentTimeMillis() < deadline
            && chain.getChainStatus() != ChainStatus.CANCELED) {
            TimeUnit.MILLISECONDS.sleep(50);
        }

        assertEquals(ChainStatus.CANCELED, chain.getChainStatus());
        assertEquals(ChainNodeStatus.CANCELED, statusOf(chain, "n1").getStatus());
        assertEquals(ChainNodeStatus.CANCELED, statusOf(chain, "n2").getStatus());
    }

    /** e2e 精确时序：取消发生在慢节点执行中，慢节点最终超时 FAILED——
     * 失败传播与取消检查点叠加，下游必须是明确终态（不能停留 READY） */
    @Test
    void cancelDuringNodeThatEventuallyFails() throws Exception {
        String ok = "cancel2-ok-" + System.nanoTime();
        String slowFail = "cancel2-fail-" + System.nanoTime();
        ChainParser.registerNodeParser(ok, (nodeJSONObject, workflow) -> okNode(nodeJSONObject.getStr("id")));
        ChainParser.registerNodeParser(slowFail, (nodeJSONObject, workflow) -> {
            ChainNode node = new ChainNode() {
                @Override
                public Map<String, Object> execute(Chain chain) {
                    try {
                        Thread.sleep(500);
                    } catch (InterruptedException e) {
                        Thread.currentThread().interrupt();
                    }
                    throw new RuntimeException("模拟请求超时");
                }
            };
            node.setId(nodeJSONObject.getStr("id"));
            return node;
        });

        JSONArray nodes = new JSONArray();
        nodes.add(node("m1", ok));
        nodes.add(node("m2", slowFail));
        nodes.add(node("m3", ok));
        JSONArray edges = new JSONArray();
        edges.add(edge("m1", "m2"));
        edges.add(edge("m2", "m3"));
        Chain chain = new ChainParser().parse(nodes, edges, new GaiaWorkflow("{}"));

        chain.executeAsync(Collections.emptyMap());
        Thread.sleep(150); // m2 执行中
        chain.requestCancel();

        long deadline = System.currentTimeMillis() + 10_000;
        while (System.currentTimeMillis() < deadline && chain.getChainStatus() == ChainStatus.RUNNING) {
            TimeUnit.MILLISECONDS.sleep(50);
        }

        assertEquals(ChainNodeStatus.FAILED, statusOf(chain, "m2").getStatus());
        assertEquals(ChainNodeStatus.CANCELED, statusOf(chain, "m3").getStatus(),
            "取消 + 失败叠加时，下游必须是 CANCELED 终态而非 READY");
        // executeInfoMap 口径：节点报告必须能查到 m3 的取消状态（TaskReport 数据源）
        ChainNodeExecuteInfo info = chain.getExecuteInfoMap().get("m3");
        org.junit.jupiter.api.Assertions.assertNotNull(info, "m3 必须有执行信息记录");
        org.junit.jupiter.api.Assertions.assertEquals(ChainNodeStatus.CANCELED, info.getStatus());
    }

    private static JSONObject node(String id, String type) {
        return new JSONObject().set("id", id).set("type", type);
    }

    private static JSONObject edge(String from, String to) {
        return new JSONObject().set("sourceNodeID", from).set("targetNodeID", to);
    }
}
