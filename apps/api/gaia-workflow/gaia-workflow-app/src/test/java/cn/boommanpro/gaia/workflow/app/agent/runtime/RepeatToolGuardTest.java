package cn.boommanpro.gaia.workflow.app.agent.runtime;

import cn.boommanpro.gaia.workflow.app.agent.tool.ToolErrorCode;
import cn.hutool.json.JSONObject;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

@DisplayName("RepeatToolGuard v2：升级提醒 + INVALID_ARGS 同参硬熔断")
class RepeatToolGuardTest {

    private static JSONObject args(String json) {
        return cn.hutool.json.JSONUtil.parseObj(json);
    }

    private static RepeatToolGuard.Verdict call(RepeatToolGuard guard, String argsJson) {
        return guard.record("edit_workflow", args(argsJson), false, ToolErrorCode.INVALID_ARGS);
    }

    @Test
    @DisplayName("同参 INVALID_ARGS：第 1 次放行，第 2 次附加提醒，第 3 次硬熔断")
    void invalidArgsEscalation() {
        RepeatToolGuard guard = new RepeatToolGuard();
        assertEquals(RepeatToolGuard.Action.NONE, call(guard, "{\"ops\":[]}").action);
        RepeatToolGuard.Verdict second = call(guard, "{\"ops\":[]}");
        assertEquals(RepeatToolGuard.Action.APPEND, second.action);
        assertTrue(second.message.contains("第 2 次"));
        RepeatToolGuard.Verdict third = call(guard, "{\"ops\":[]}");
        assertEquals(RepeatToolGuard.Action.STOP, third.action);
        assertTrue(third.message.contains("终止"));
    }

    @Test
    @DisplayName("硬熔断后继续同参仍 STOP（幂等，引擎只取首个原因）")
    void stopIsSticky() {
        RepeatToolGuard guard = new RepeatToolGuard();
        call(guard, "{\"a\":1}");
        call(guard, "{\"a\":1}");
        assertEquals(RepeatToolGuard.Action.STOP, call(guard, "{\"a\":1}").action);
        assertEquals(RepeatToolGuard.Action.STOP, call(guard, "{\"a\":1}").action);
    }

    @Test
    @DisplayName("换参数 = 重置链：不同参数打断连续链，旧参数重新计数")
    void differentArgsResetsChain() {
        RepeatToolGuard guard = new RepeatToolGuard();
        assertEquals(RepeatToolGuard.Action.NONE, call(guard, "{\"a\":1}").action);
        assertEquals(RepeatToolGuard.Action.NONE, call(guard, "{\"a\":2}").action);
        // {"a":1} 的链被 {"a":2} 打断，回到计数 1
        assertEquals(RepeatToolGuard.Action.NONE, call(guard, "{\"a\":1}").action);
        // 连续第 2 次同参 → 提醒；第 3 次 → 熔断
        assertEquals(RepeatToolGuard.Action.APPEND, call(guard, "{\"a\":1}").action);
        assertEquals(RepeatToolGuard.Action.STOP, call(guard, "{\"a\":1}").action);
    }

    @Test
    @DisplayName("键序规范化：{a,b} 与 {b,a} 视为同一参数")
    void canonicalKeyOrdering() {
        RepeatToolGuard guard = new RepeatToolGuard();
        JSONObject ab = new JSONObject().set("a", "1").set("b", "2");
        JSONObject ba = new JSONObject().set("b", "2").set("a", "1");
        assertEquals(RepeatToolGuard.Action.NONE,
            guard.record("t", ab, false, ToolErrorCode.INVALID_ARGS).action);
        assertEquals(RepeatToolGuard.Action.APPEND,
            guard.record("t", ba, false, ToolErrorCode.INVALID_ARGS).action);
        assertEquals(RepeatToolGuard.Action.STOP,
            guard.record("t", ab, false, ToolErrorCode.INVALID_ARGS).action);
    }

    @Test
    @DisplayName("非 INVALID_ARGS 复读走 3/5/8 提醒阶梯，不熔断")
    void nonInvalidArgsLadder() {
        RepeatToolGuard guard = new RepeatToolGuard();
        assertEquals(RepeatToolGuard.Action.NONE,
            guard.record("read_workflow", args("{\"workflowCode\":\"wf\"}"), false, ToolErrorCode.NOT_FOUND).action);
        assertEquals(RepeatToolGuard.Action.NONE,
            guard.record("read_workflow", args("{\"workflowCode\":\"wf\"}"), false, ToolErrorCode.NOT_FOUND).action);
        assertEquals(RepeatToolGuard.Action.APPEND,
            guard.record("read_workflow", args("{\"workflowCode\":\"wf\"}"), false, ToolErrorCode.NOT_FOUND).action);
        // 第 4 次不在阶梯上（3/5/8 精确触发），不打扰
        assertEquals(RepeatToolGuard.Action.NONE,
            guard.record("read_workflow", args("{\"workflowCode\":\"wf\"}"), false, ToolErrorCode.NOT_FOUND).action);
        // 第 5 次
        assertEquals(RepeatToolGuard.Action.APPEND,
            guard.record("read_workflow", args("{\"workflowCode\":\"wf\"}"), false, ToolErrorCode.NOT_FOUND).action);
        // 成功一次即重置
        assertNull(guard.record("read_workflow", args("{\"workflowCode\":\"wf\"}"), true, null).message);
        assertEquals(RepeatToolGuard.Action.NONE,
            guard.record("read_workflow", args("{\"workflowCode\":\"wf\"}"), false, ToolErrorCode.NOT_FOUND).action);
    }

    @Test
    @DisplayName("不同工具互不干扰")
    void perToolKeys() {
        RepeatToolGuard guard = new RepeatToolGuard();
        assertEquals(RepeatToolGuard.Action.NONE, call(guard, "{\"x\":1}").action);
        assertEquals(RepeatToolGuard.Action.NONE,
            guard.record("run_workflow", args("{\"x\":1}"), false, ToolErrorCode.INVALID_ARGS).action);
    }
}
