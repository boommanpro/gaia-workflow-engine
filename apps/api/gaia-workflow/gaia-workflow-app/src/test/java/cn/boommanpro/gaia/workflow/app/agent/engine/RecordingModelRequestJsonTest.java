package cn.boommanpro.gaia.workflow.app.agent.engine;

import cn.hutool.json.JSONArray;
import cn.hutool.json.JSONObject;
import io.agentscope.core.message.Msg;
import io.agentscope.core.message.MsgRole;
import io.agentscope.core.message.TextBlock;
import io.agentscope.core.message.ToolResultBlock;
import io.agentscope.core.message.ToolResultMessage;
import io.agentscope.core.message.ToolUseBlock;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * request_json 落账的保真口径：工具结果必须按「内容块」判定（框架不同链路会用
 * role=TOOL 的普通 Msg 或 ToolResultMessage 装同样的 ToolResultBlock），
 * 任何一条链路漏掉都会复现 2026-10-11 账本 tool 行 content="" 的数据丢失。
 */
class RecordingModelRequestJsonTest {

    private static final String TOOL_JSON = "{\"ok\":true,\"workflowCode\":\"string_contains_check\"}";

    private ToolResultBlock resultBlock() {
        return ToolResultBlock.text(TOOL_JSON).withIdAndName("call_1", "write_workflow");
    }

    @Test
    @DisplayName("role=TOOL 的普通 Msg 装 ToolResultBlock → content/tool_call_id 不丢（bug 场景回归）")
    void plainToolRoleMsgKeepsContent() {
        Msg msg = Msg.builder().role(MsgRole.TOOL).content(resultBlock()).build();

        JSONArray messages = RecordingModel.openAiMessages(List.of(msg));

        assertEquals(1, messages.size());
        JSONObject tool = messages.getJSONObject(0);
        assertEquals("tool", tool.getStr("role"));
        assertEquals("call_1", tool.getStr("tool_call_id"));
        assertEquals("write_workflow", tool.getStr("name"));
        assertEquals(TOOL_JSON, tool.getStr("content"));
    }

    @Test
    @DisplayName("ToolResultMessage 实例 → 同样正确序列化")
    void toolResultMessageKeepsContent() {
        Msg msg = new ToolResultMessage(resultBlock());

        JSONArray messages = RecordingModel.openAiMessages(List.of(msg));

        assertEquals(1, messages.size());
        JSONObject tool = messages.getJSONObject(0);
        assertEquals("tool", tool.getStr("role"));
        assertEquals("call_1", tool.getStr("tool_call_id"));
        assertEquals(TOOL_JSON, tool.getStr("content"));
    }

    @Test
    @DisplayName("assistant 带 ToolUseBlock → content 可为空但 tool_calls.arguments 完整保留")
    void assistantToolCallsKeepArguments() {
        ToolUseBlock use = new ToolUseBlock("call_9", "edit_workflow",
            java.util.Map.of("ops", "x"));
        Msg msg = Msg.builder().role(MsgRole.ASSISTANT).content(use).build();

        JSONArray messages = RecordingModel.openAiMessages(List.of(msg));

        assertEquals(1, messages.size());
        JSONObject assistant = messages.getJSONObject(0);
        assertEquals("assistant", assistant.getStr("role"));
        JSONArray calls = assistant.getJSONArray("tool_calls");
        assertNotNull(calls);
        JSONObject function = calls.getJSONObject(0).getJSONObject("function");
        assertEquals("edit_workflow", function.getStr("name"));
        assertTrue(function.getStr("arguments").contains("\"ops\""));
    }

    @Test
    @DisplayName("assistant 文本 + 空输出工具 → 两个口径都诚实（不造假内容）")
    void emptyOutputStaysEmpty() {
        ToolResultBlock empty = ToolResultBlock.text("").withIdAndName("call_2", "list_workflows");
        Msg tool = Msg.builder().role(MsgRole.TOOL).content(empty).build();
        Msg user = Msg.builder().role(MsgRole.USER).textContent("HELLO").build();

        JSONArray messages = RecordingModel.openAiMessages(List.of(user, tool));

        assertEquals(2, messages.size());
        assertEquals("HELLO", messages.getJSONObject(0).getStr("content"));
        assertEquals("", messages.getJSONObject(1).getStr("content"));
    }

    @Test
    @DisplayName("TextBlock 输出以外的块类型 → 整块 JSON 序列化，不静默丢弃")
    void nonTextOutputBlockIsSerializedNotDropped() {
        ToolResultBlock dataResult = new ToolResultBlock("call_3", "search_knowledge",
            List.of(TextBlock.builder().text("部分文本").build(),
                io.agentscope.core.message.DataBlock.builder()
                    .source(new io.agentscope.core.message.Source())
                    .name("knowledge-hits").build()));
        Msg msg = Msg.builder().role(MsgRole.TOOL).content(dataResult).build();

        JSONArray messages = RecordingModel.openAiMessages(List.of(msg));

        JSONObject tool = messages.getJSONObject(0);
        String content = tool.getStr("content");
        assertTrue(content.contains("部分文本"));
        assertTrue(content.contains("knowledge-hits"), "DataBlock 应被序列化保留：" + content);
    }
}
