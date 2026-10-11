package cn.boommanpro.gaia.workflow.app.agent.session;

import cn.hutool.json.JSONArray;
import cn.hutool.json.JSONObject;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

@DisplayName("SessionEventBus：快照时间线（thinking/text/tool/notice 交错 + 刷新恢复依据）")
class SessionEventBusTest {

    @Test
    @DisplayName("token/thinking/tool_call/tool_result 按真实顺序构建交错时间线")
    void timelineInterleavesInRealOrder() {
        SessionEventBus bus = new SessionEventBus();
        bus.publish("s", "turn", new JSONObject().set("turn", 1));
        bus.publish("s", "thinking", new JSONObject().set("content", "先看现状"));
        bus.publish("s", "token", new JSONObject().set("content", "我来修改"));
        bus.publish("s", "tool_call", new JSONObject()
            .set("id", "call-1").set("name", "edit_workflow")
            .set("args", new JSONObject().set("ops", new JSONArray())));
        bus.publish("s", "tool_result", new JSONObject()
            .set("toolCallId", "call-1").set("payload", "{\"success\":true}").set("rejected", false));
        bus.publish("s", "token", new JSONObject().set("content", "完成"));
        bus.publish("s", "repeat_reminder", new JSONObject().set("message", "复读警报"));

        JSONObject state = bus.getState("s");
        JSONArray timeline = state.getJSONArray("timeline");
        assertNotNull(timeline);
        // thinking → text → tool → text（tool_result 不新增条目，只回填） → notice
        assertEquals(5, timeline.size());
        assertEquals("thinking", timeline.getJSONObject(0).getStr("kind"));
        assertEquals("先看现状", timeline.getJSONObject(0).getStr("text"));
        assertEquals("text", timeline.getJSONObject(1).getStr("kind"));
        assertEquals("tool", timeline.getJSONObject(2).getStr("kind"));
        assertEquals("call-1", timeline.getJSONObject(2).getStr("id"));
        assertEquals("text", timeline.getJSONObject(3).getStr("kind"));
        assertEquals("完成", timeline.getJSONObject(3).getStr("text"));
        assertEquals("notice", timeline.getJSONObject(4).getStr("kind"));
        assertEquals("复读警报", timeline.getJSONObject(4).getStr("text"));
        // tool_result 回填进了时间线的工具条目
        assertEquals("{\"success\":true}", timeline.getJSONObject(2).getJSONObject("call").getStr("result"));
        // thinking 聚合字段
        assertEquals("先看现状", state.getStr("thinking"));
    }

    @Test
    @DisplayName("相邻同类条目续写不分裂（与前端 live 行为一致）")
    void adjacentSameKindMerge() {
        SessionEventBus bus = new SessionEventBus();
        bus.publish("s", "turn", new JSONObject().set("turn", 1));
        bus.publish("s", "token", new JSONObject().set("content", "你好"));
        bus.publish("s", "token", new JSONObject().set("content", "，世界"));
        bus.publish("s", "thinking", new JSONObject().set("content", "想"));
        bus.publish("s", "thinking", new JSONObject().set("content", "清楚了"));
        bus.publish("s", "token", new JSONObject().set("content", "答案"));

        JSONArray timeline = bus.getState("s").getJSONArray("timeline");
        assertEquals(3, timeline.size());
        assertEquals("你好，世界", timeline.getJSONObject(0).getStr("text"));
        assertEquals("想清楚了", timeline.getJSONObject(1).getStr("text"));
        assertEquals("答案", timeline.getJSONObject(2).getStr("text"));
    }

    @Test
    @DisplayName("tool_result 回填同时作用于 toolCalls 数组与时间线条目")
    void toolResultPatchesBothStructures() {
        SessionEventBus bus = new SessionEventBus();
        bus.publish("s", "turn", new JSONObject().set("turn", 1));
        bus.publish("s", "tool_call", new JSONObject()
            .set("id", "call-9").set("name", "save_workflow").set("args", new JSONObject()));
        bus.publish("s", "tool_result", new JSONObject()
            .set("toolCallId", "call-9").set("payload", "ok").set("rejected", false));

        JSONObject state = bus.getState("s");
        JSONObject callEntry = state.getJSONArray("toolCalls").getJSONObject(0);
        assertEquals("done", callEntry.getStr("status"));
        assertEquals("ok", callEntry.getStr("result"));
        JSONObject timelineCall = state.getJSONArray("timeline").getJSONObject(0).getJSONObject("call");
        assertEquals("done", timelineCall.getStr("status"));
        assertEquals("ok", timelineCall.getStr("result"));
    }

    @Test
    @DisplayName("时间线条目超上限时头部丢弃（防超长 run 撑爆快照）")
    void timelineCapped() {
        SessionEventBus bus = new SessionEventBus();
        bus.publish("s", "turn", new JSONObject().set("turn", 1));
        for (int i = 0; i < 230; i++) {
            bus.publish("s", "tool_call", new JSONObject().set("id", "c" + i).set("name", "t").set("args", new JSONObject()));
        }
        JSONArray timeline = bus.getState("s").getJSONArray("timeline");
        assertEquals(200, timeline.size());
        assertEquals("c30", timeline.getJSONObject(0).getStr("id"));
    }

    @Test
    @DisplayName("订阅回放包含完整快照（刷新恢复入口）")
    void subscribeReplaysSnapshot() {
        SessionEventBus bus = new SessionEventBus();
        bus.publish("s", "turn", new JSONObject().set("turn", 1));
        bus.publish("s", "token", new JSONObject().set("content", "进度"));
        final JSONObject[] replayed = new JSONObject[1];
        bus.subscribe("s", (type, data) -> {
            if ("run_state".equals(type)) {
                replayed[0] = data;
            }
            return true;
        });
        assertNotNull(replayed[0]);
        assertEquals("running", replayed[0].getStr("status"));
        assertTrue(replayed[0].getJSONArray("timeline").size() > 0);
    }
}
