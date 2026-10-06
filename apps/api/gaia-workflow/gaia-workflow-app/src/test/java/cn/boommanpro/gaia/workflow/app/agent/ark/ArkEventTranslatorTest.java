package cn.boommanpro.gaia.workflow.app.agent.ark;

import cn.boommanpro.gaia.workflow.app.agent.event.AgentEvent;
import cn.hutool.json.JSONArray;
import cn.hutool.json.JSONObject;
import cn.hutool.json.JSONUtil;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

@DisplayName("ArkEventTranslator：方舟事件 → 本项目事件映射")
class ArkEventTranslatorTest {


    private static JSONArray textBlocks(String text) {
        JSONArray blocks = new JSONArray();
        blocks.add(new JSONObject().set("type", "text").set("text", text));
        return blocks;
    }

    private static JSONObject event(String type) {
        return new JSONObject().set("id", "sevt-test").set("type", type);
    }

    @Test
    @DisplayName("agent.message 全量文本 → token 增量（前缀 diff）")
    void messagePrefixDiff() {
        ArkEventTranslator translator = new ArkEventTranslator();

        List<AgentEvent> first = translator.translate(event("agent.message")
            .set("content", textBlocks("你好")));
        assertEquals(1, first.size());
        assertEquals("token", first.get(0).getType());
        assertEquals("你好", first.get(0).getData().getStr("content"));

        // 全量重发（增量形态）→ 只产出新增部分
        List<AgentEvent> second = translator.translate(event("agent.message")
            .set("content", textBlocks("你好，世界")));
        assertEquals(1, second.size());
        assertEquals("，世界", second.get(0).getData().getStr("content"));

        // 完全相同 → 不产出
        List<AgentEvent> same = translator.translate(event("agent.message")
            .set("content", textBlocks("你好，世界")));
        assertTrue(same.isEmpty());
    }

    @Test
    @DisplayName("不连续文本视为新回复，重置缓冲")
    void messageResetOnDiscontinuous() {
        ArkEventTranslator translator = new ArkEventTranslator();
        translator.translate(event("agent.message")
            .set("content", textBlocks("第一段")));

        List<AgentEvent> events = translator.translate(event("agent.message")
            .set("content", textBlocks("第二段")));
        assertEquals(1, events.size());
        assertEquals("第二段", events.get(0).getData().getStr("content"));
        assertEquals("第二段", translator.getFinalContent());
    }

    @Test
    @DisplayName("agent.thinking → thinking 事件")
    void thinkingEvent() {
        ArkEventTranslator translator = new ArkEventTranslator();
        List<AgentEvent> events = translator.translate(event("agent.thinking")
            .set("content", textBlocks("思考中")));
        assertEquals(1, events.size());
        assertEquals("thinking", events.get(0).getType());
        assertEquals("思考中", events.get(0).getData().getStr("content"));
    }

    @Test
    @DisplayName("agent.tool_use → tool_call（executedBy=ark-sandbox）")
    void sandboxToolUse() {
        ArkEventTranslator translator = new ArkEventTranslator();
        List<AgentEvent> events = translator.translate(event("agent.tool_use")
            .set("id", "sevt-1")
            .set("name", "bash")
            .set("input", new JSONObject().set("command", "ls")));
        assertEquals(1, events.size());
        AgentEvent e = events.get(0);
        assertEquals("tool_call", e.getType());
        assertEquals("sevt-1", e.getData().getStr("id"));
        assertEquals("bash", e.getData().getStr("name"));
        assertEquals("ark-sandbox", e.getData().getStr("executedBy"));
        assertEquals("ls", e.getData().getJSONObject("args").getStr("command"));
    }

    @Test
    @DisplayName("agent.custom_tool_use → tool_call（executedBy=backend，由引擎派发）")
    void customToolUse() {
        ArkEventTranslator translator = new ArkEventTranslator();
        List<AgentEvent> events = translator.translate(event("agent.custom_tool_use")
            .set("id", "sevt-2")
            .set("name", "query")
            .set("input", new JSONObject().set("action", "listWorkflows")));
        assertEquals(1, events.size());
        assertEquals("backend", events.get(0).getData().getStr("executedBy"));
        assertEquals("query", events.get(0).getData().getStr("name"));
    }

    @Test
    @DisplayName("agent.tool_result → tool_result（toolCallId 关联 tool_use_id）")
    void toolResult() {
        ArkEventTranslator translator = new ArkEventTranslator();
        List<AgentEvent> events = translator.translate(event("agent.tool_result")
            .set("tool_use_id", "sevt-1")
            .set("content", textBlocks("{\"ok\":true}")));
        assertEquals(1, events.size());
        assertEquals("tool_result", events.get(0).getType());
        assertEquals("sevt-1", events.get(0).getData().getStr("toolCallId"));
        assertEquals("{\"ok\":true}", events.get(0).getData().getStr("payload"));
    }

    @Test
    @DisplayName("span.model_request_end → 累计用量 + usage 事件")
    void usageAccumulation() {
        ArkEventTranslator translator = new ArkEventTranslator();
        translator.translate(event("span.model_request_end").set("model_usage",
            new JSONObject().set("input_tokens", 100).set("output_tokens", 20)));
        List<AgentEvent> second = translator.translate(event("span.model_request_end").set("model_usage",
            new JSONObject().set("input_tokens", 50).set("output_tokens", 30)
                .set("cache_read_input_tokens", 80)));

        assertEquals(1, second.size());
        assertEquals("usage", second.get(0).getType());
        JSONObject total = second.get(0).getData().getJSONObject("total");
        assertEquals(150L, total.getLong("input_tokens").longValue());
        assertEquals(50L, total.getLong("output_tokens").longValue());
        assertEquals(80L, total.getLong("cache_read_input_tokens").longValue());
        assertEquals(2, translator.getModelRequests());
        assertEquals(150L, translator.getUsageJson().getLong("input_tokens").longValue());
    }

    @Test
    @DisplayName("session 控制事件不产出（由引擎消费）")
    void controlEventsProduceNothing() {
        ArkEventTranslator translator = new ArkEventTranslator();
        assertTrue(translator.translate(event("session.status_running")).isEmpty());
        assertTrue(translator.translate(event("session.status_idle")
            .set("stop_reason", new JSONObject().set("type", "end_turn"))).isEmpty());
        assertTrue(translator.translate(event("session.error")).isEmpty());
        assertTrue(translator.translate(event("agent.thread_message_sent")).isEmpty());
        assertTrue(translator.translate(null).isEmpty());
    }

    @Test
    @DisplayName("畸形事件不抛异常")
    void malformedEventNoThrow() {
        ArkEventTranslator translator = new ArkEventTranslator();
        assertTrue(translator.translate(new JSONObject().set("type", "agent.message")
            .set("content", "not-an-array")).size() <= 1);
        assertTrue(translator.translate(JSONUtil.parseObj("{\"type\":\"agent.tool_use\"}")).size() == 1);
    }
}
