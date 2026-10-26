package cn.boommanpro.gaia.workflow.base.node;

import cn.boommanpro.gaia.workflow.base.model.Chain;
import cn.boommanpro.gaia.workflow.base.model.ChainNode;
import cn.hutool.json.JSONArray;
import cn.hutool.json.JSONObject;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.Collections;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * 「并发分支的出线不允许进入另一个并发分支」只约束真正的并发扇出（无条件多出边）。
 * condition / branches 的多出边是互斥路由，多个条件分支汇到同一下游是合法拓扑
 * （2026-10-24 会话 b6e34195 实证：「低风险并入自动分支」被误拦，模型重连 40 余次无解）。
 */
@DisplayName("ChainParser：条件分支汇合放行，无条件并发交叉仍拦截")
class ChainParserBranchMergeTest {

    private static final String TYPE = "stub-merge-" + System.nanoTime();

    static {
        ChainParser.registerNodeParser(TYPE, (nodeJSONObject, workflow) -> {
            ChainNode stub = new ChainNode() {
                @Override
                public Map<String, Object> execute(Chain chain) {
                    return Collections.emptyMap();
                }
            };
            stub.setId(nodeJSONObject.getStr("id"));
            return stub;
        });
    }

    private static JSONArray nodes(String... ids) {
        JSONArray arr = new JSONArray();
        for (String id : ids) {
            arr.add(new JSONObject().set("id", id).set("type", TYPE));
        }
        return arr;
    }

    private static JSONObject edge(String from, String to, String port) {
        JSONObject e = new JSONObject().set("sourceNodeID", from).set("targetNodeID", to);
        if (port != null) {
            e.set("sourcePortID", port);
        }
        return e;
    }

    @Test
    @DisplayName("两个条件节点的出边汇到同一个下游（低风险并入自动分支）：解析通过")
    void conditionalBranchesMayMerge() {
        JSONArray edges = new JSONArray()
            .set(edge("start", "cond1", null))
            .set(edge("cond1", "cond2", "high"))
            .set(edge("cond1", "merge", "else"))
            .set(edge("cond2", "notify", "high"))
            .set(edge("cond2", "merge", "low"))
            .set(edge("notify", "end", null))
            .set(edge("merge", "end", null));
        Chain chain = new ChainParser().parse(nodes("start", "cond1", "cond2", "notify", "merge", "end"), edges, null);
        assertEquals(6, chain.getNodes().size());
    }

    @Test
    @DisplayName("无条件并行扇出的分支交叉连线：仍然拦截，且报错点名哪条线")
    void unconditionalParallelCrossLinkStillRejected() {
        JSONArray edges = new JSONArray()
            .set(edge("start", "p", null))
            .set(edge("start", "q", null))
            .set(edge("p", "r", null))
            .set(edge("p", "q", null));
        RuntimeException ex = assertThrows(RuntimeException.class,
            () -> new ChainParser().parse(nodes("start", "p", "q", "r"), edges, null));
        assertTrue(ex.getMessage().contains("并发分支"), ex.getMessage());
        assertTrue(ex.getMessage().contains("p → q"), ex.getMessage());
    }
}
