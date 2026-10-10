package cn.boommanpro.gaia.workflow.app.service;

import cn.hutool.json.JSONObject;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

@DisplayName("WorkflowDiffService：版本差异计算")
class WorkflowDiffServiceTest {

    private final WorkflowDiffService service = new WorkflowDiffService();

    private static final String V1 = "{\"nodes\":["
        + "{\"id\":\"start_0\",\"type\":\"start\",\"meta\":{\"position\":{\"x\":1,\"y\":1}},\"data\":{\"title\":\"s\"}},"
        + "{\"id\":\"llm_1\",\"type\":\"llm\",\"meta\":{\"position\":{\"x\":2,\"y\":2}},\"data\":{\"title\":\"l\",\"prompt\":\"old\"}}"
        + "],\"edges\":["
        + "{\"sourceNodeID\":\"start_0\",\"targetNodeID\":\"llm_1\"}"
        + "]}";

    @Test
    @DisplayName("新增/删除节点与连线都被识别")
    void addRemoveDetected() {
        String v2 = "{\"nodes\":["
            + "{\"id\":\"start_0\",\"type\":\"start\",\"data\":{}},"
            + "{\"id\":\"http_2\",\"type\":\"http\",\"data\":{}}"
            + "],\"edges\":["
            + "{\"sourceNodeID\":\"start_0\",\"targetNodeID\":\"http_2\"}"
            + "]}";
        JSONObject diff = service.diff(V1, v2);
        assertEquals("[\"llm_1\"]", diff.getJSONObject("nodes").getJSONArray("removed").toString());
        assertEquals("[\"http_2\"]", diff.getJSONObject("nodes").getJSONArray("added").toString());
        assertEquals(1, diff.getJSONObject("edges").getJSONArray("added").size());
        assertEquals(1, diff.getJSONObject("edges").getJSONArray("removed").size());
        assertTrue(service.summarize(diff).contains("+1节点"));
        assertTrue(service.summarize(diff).contains("-1节点"));
    }

    @Test
    @DisplayName("data 变更算 changed；仅坐标变更不算")
    void dataChangeCountsCoordinateDoesNot() {
        String v2 = "{\"nodes\":["
            + "{\"id\":\"start_0\",\"type\":\"start\",\"meta\":{\"position\":{\"x\":1,\"y\":1}},\"data\":{\"title\":\"s\"}},"
            + "{\"id\":\"llm_1\",\"type\":\"llm\",\"meta\":{\"position\":{\"x\":99,\"y\":99}},\"data\":{\"title\":\"l\",\"prompt\":\"new\"}}"
            + "],\"edges\":["
            + "{\"sourceNodeID\":\"start_0\",\"targetNodeID\":\"llm_1\"}"
            + "]}";
        JSONObject diff = service.diff(V1, v2);
        assertEquals("[\"llm_1\"]", diff.getJSONObject("nodes").getJSONArray("changed").toString());
        assertEquals(0, diff.getJSONObject("nodes").getJSONArray("added").size());

        // 只动坐标 → 无实质变更
        String v3 = v2.replace("\"prompt\":\"new\"", "\"prompt\":\"old\"");
        JSONObject diff2 = service.diff(V1, v3);
        assertTrue(service.isEmpty(diff2), diff2.toString());
    }

    @Test
    @DisplayName("首版（previous=null）全部记为 added")
    void firstVersionAllAdded() {
        JSONObject diff = service.diff(null, V1);
        assertEquals(2, diff.getJSONObject("nodes").getJSONArray("added").size());
        assertEquals(1, diff.getJSONObject("edges").getJSONArray("added").size());
    }
}
