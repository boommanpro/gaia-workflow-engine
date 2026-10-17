package cn.boommanpro.gaia.workflow.app.service;

import cn.hutool.json.JSONUtil;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

/**
 * 回归（2026-10-17 E2E 实证）：condition 同一 source→target 的 if/else 双边
 * 是合法结构，canonicalizer 去重不得按端点吞掉 else 边。
 */
class CanonicalizerPortEdgeDedupTest {

    @Test
    @DisplayName("if/else 双边指向同一目标：去重后两条都保留")
    void portEdgesSurviveDedup() {
        String dsl = "{\"nodes\":[{\"id\":\"cond\",\"type\":\"condition\",\"data\":{\"conditions\":[{\"key\":\"if_match\",\"value\":{}}]}},"
            + "{\"id\":\"code\",\"type\":\"code\",\"data\":{\"script\":{\"content\":\"({})\"}}}],"
            + "\"edges\":["
            + "{\"sourceNodeID\":\"cond\",\"targetNodeID\":\"code\",\"sourcePortID\":\"if_match\"},"
            + "{\"sourceNodeID\":\"cond\",\"targetNodeID\":\"code\",\"sourcePortID\":\"else\"}]}";
        WorkflowDslCanonicalizer.Result result = WorkflowDslCanonicalizer.canonicalize(dsl);
        assertNotNull(result.getJson());
        cn.hutool.json.JSONArray edges = JSONUtil.parseObj(result.getJson()).getJSONArray("edges");
        long condCodeEdges = 0;
        for (Object eObj : edges) {
            cn.hutool.json.JSONObject e = (cn.hutool.json.JSONObject) eObj;
            if ("cond".equals(e.getStr("sourceNodeID")) && "code".equals(e.getStr("targetNodeID"))) {
                condCodeEdges++;
            }
        }
        assertEquals(2, condCodeEdges, "if/else 两条边都必须保留，实际: " + edges);
    }
}
