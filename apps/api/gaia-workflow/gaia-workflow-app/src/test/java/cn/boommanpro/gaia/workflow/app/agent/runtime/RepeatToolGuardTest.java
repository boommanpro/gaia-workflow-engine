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
    @DisplayName("换参不打断失败累计：同参失败跨其他调用累计到熔断（仅同 key 成功清零）")
    void differentArgsResetsChain() {
        RepeatToolGuard guard = new RepeatToolGuard();
        assertEquals(RepeatToolGuard.Action.NONE, call(guard, "{\"a\":1}").action);
        assertEquals(RepeatToolGuard.Action.NONE, call(guard, "{\"a\":2}").action);
        // 2026-10-11 三轮实证：write 失败 → edit/read 失败 → write 同参复读，
        // 复读链曾被中间调用清零导致阶梯提醒失位。现在失败按 key 持久累计：
        // {"a":1} 第 2 次失败（虽然中间夹了 {"a":2}）→ 提醒
        assertEquals(RepeatToolGuard.Action.APPEND, call(guard, "{\"a\":1}").action);
        // 第 3 次同参失败 → 熔断
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
        // 成功不再无条件重置（2026-10-11 实证：同参成功复读 8 次原地空转）：
        // 此处已是第 6 次连续同工具调用（前面 5 次失败 + 本次成功），同工具硬熔断生效
        RepeatToolGuard.Verdict sixth = guard.record("read_workflow", args("{\"workflowCode\":\"wf\"}"), true, null);
        assertEquals(RepeatToolGuard.Action.STOP, sixth.action);
        assertTrue(sixth.message.contains("护栏"));
    }

    @Test
    @DisplayName("edit→run 交替循环触发循环警报")
    void alternatingLoopDetected() {
        RepeatToolGuard guard = new RepeatToolGuard();
        String edit = "{\"updateNodes\":[{\"nodeId\":\"end_1\"}]}";
        String run = "{\"inputs\":{\"q\":\"x\"}}";
        RepeatToolGuard.Verdict v = RepeatToolGuard.Verdict.none();
        for (int i = 0; i < 4 && v.action != RepeatToolGuard.Action.APPEND; i++) {
            v = guard.record("edit_workflow", args(edit), true, null);
            if (v.action == RepeatToolGuard.Action.APPEND) { break; }
            v = guard.record("run_workflow", args(run), true, null);
        }
        assertEquals(RepeatToolGuard.Action.APPEND, v.action);
        assertTrue(v.message.contains("循环警报"));
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
