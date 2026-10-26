package cn.boommanpro.gaia.workflow.app.agent.runtime;

import cn.boommanpro.gaia.workflow.app.agent.tool.ToolErrorCode;
import cn.hutool.json.JSONObject;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

@DisplayName("RepeatToolGuard v3：同参复读阶梯 + 目标实体感知/轮边界感知的同目标 streak")
class RepeatToolGuardTest {

    private static JSONObject args(String json) {
        return cn.hutool.json.JSONUtil.parseObj(json);
    }

    private static RepeatToolGuard.Verdict call(RepeatToolGuard guard, String argsJson) {
        return guard.record("edit_workflow", args(argsJson), false, ToolErrorCode.INVALID_ARGS);
    }

    // ===== 同参数复读（key 级，与 streak 无关） =====

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
        // v3（2026-10-24）：成功连发不再硬熔断——首次成功换链，无同参成功复读、无跨轮同目标 streak
        assertEquals(RepeatToolGuard.Action.NONE,
            guard.record("read_workflow", args("{\"workflowCode\":\"wf\"}"), true, null).action);
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

    // ===== v3：目标实体 + 轮边界感知的 streak =====
    // 背景：2026-10-24 会话 80bec2df 两轮被旧版（仅按工具名计 streak）误杀——
    // 一轮是同轮并行 get ×7 查 6 类节点契约（手册教的标准动作），
    // 一轮是跨轮 node ×6 逐节点配置（nodeId 各不相同、全部成功、都在推进任务）。

    @Test
    @DisplayName("回归-误杀场景1：同轮并行批量查不同目标（get ×7，nodeType 各异）全程不触发护栏")
    void batchParallelGetsDifferentTargetsNoGuard() {
        RepeatToolGuard guard = new RepeatToolGuard();
        guard.onModelTurn(); // 模型一次决策并行发出 7 个 get（同轮批量）
        RepeatToolGuard.Verdict v = guard.record("get", args("{\"target\":\"canvas\"}"), true, null);
        assertEquals(RepeatToolGuard.Action.NONE, v.action);
        for (String type : new String[]{"start", "end", "http", "code", "condition", "llm"}) {
            v = guard.record("get", args("{\"target\":\"knowledge\",\"nodeType\":\"" + type + "\"}"), true, null);
            assertEquals(RepeatToolGuard.Action.NONE, v.action);
        }
    }

    @Test
    @DisplayName("回归-误杀场景2：跨轮逐节点配置（node ×8，nodeId 各异，全部成功）全程不触发护栏")
    void crossTurnDistinctTargetsNoGuard() {
        RepeatToolGuard guard = new RepeatToolGuard();
        String[] nodes = {"start_1", "http_fx", "code_validate", "cond_amount", "llm_risk",
            "http_stock", "cond_stock", "llm_apology"};
        for (String node : nodes) {
            guard.onModelTurn();
            RepeatToolGuard.Verdict v = guard.record("node",
                args("{\"action\":\"update\",\"nodeId\":\"" + node + "\",\"data\":{\"title\":\"t-" + node + "\"}}"),
                true, null);
            assertEquals(RepeatToolGuard.Action.NONE, v.action);
        }
    }

    @Test
    @DisplayName("同轮并行的同目标重复调用不计入 streak（模型未见到结果，无复读语义）")
    void sameTurnBatchDoesNotAccumulateStreak() {
        RepeatToolGuard guard = new RepeatToolGuard();
        guard.onModelTurn(); // 一个模型轮内 6 个同目标调用（参数微差）
        for (int i = 1; i <= 6; i++) {
            RepeatToolGuard.Verdict v = guard.record("node",
                args("{\"action\":\"update\",\"nodeId\":\"n1\",\"data\":{\"i\":" + i + "}}"), true, null);
            assertEquals(RepeatToolGuard.Action.NONE, v.action);
        }
    }

    @Test
    @DisplayName("跨轮同目标成功连发：第 4 次提醒、第 6 次起每次提醒，但永不熔断")
    void sameTargetSuccessStreakRemindsOnly() {
        RepeatToolGuard guard = new RepeatToolGuard();
        for (int i = 1; i <= 8; i++) {
            guard.onModelTurn();
            RepeatToolGuard.Verdict v = guard.record("node",
                args("{\"action\":\"update\",\"nodeId\":\"http_fx\",\"data\":{\"v\":" + i + "}}"), true, null);
            if (i == 4) {
                assertEquals(RepeatToolGuard.Action.APPEND, v.action);
                assertTrue(v.message.contains("http_fx"));
            } else if (i >= 6) {
                assertEquals(RepeatToolGuard.Action.APPEND, v.action);
            } else {
                assertEquals(RepeatToolGuard.Action.NONE, v.action);
            }
        }
    }

    @Test
    @DisplayName("跨轮同目标失败连发：第 4 次提醒、第 6 次硬熔断（微变参空转保护保留）")
    void sameTargetFailStreakStillHardStops() {
        RepeatToolGuard guard = new RepeatToolGuard();
        for (int i = 1; i <= 6; i++) {
            guard.onModelTurn();
            RepeatToolGuard.Verdict v = guard.record("node",
                args("{\"action\":\"add\",\"type\":\"http\",\"data\":{\"v\":" + i + "}}"),
                false, ToolErrorCode.EXEC_ERROR);
            if (i == 4) {
                assertEquals(RepeatToolGuard.Action.APPEND, v.action);
            } else if (i == 6) {
                assertEquals(RepeatToolGuard.Action.STOP, v.action);
                assertTrue(v.message.contains("终止"));
            } else {
                assertEquals(RepeatToolGuard.Action.NONE, v.action);
            }
        }
    }

    @Test
    @DisplayName("todo_write 变参全量重写连发（跨轮）仍计入 streak（2026-10-11 保护不回退）")
    void todoWriteLoopStillCounted() {
        RepeatToolGuard guard = new RepeatToolGuard();
        RepeatToolGuard.Verdict v = RepeatToolGuard.Verdict.none();
        for (int i = 1; i <= 4; i++) {
            guard.onModelTurn();
            v = guard.record("todo_write",
                args("{\"steps\":[{\"id\":\"" + i + "\",\"content\":\"步骤" + i + "\",\"status\":\"pending\"}]}"),
                true, null);
        }
        assertEquals(RepeatToolGuard.Action.APPEND, v.action);
    }

    @Test
    @DisplayName("回归-实证场景3：周期 5 的 run×2→test_case×2→run(tests) 原样循环：第 2 轮警告、第 3 轮硬停")
    void periodFiveCycleWarnsThenStops() {
        RepeatToolGuard guard = new RepeatToolGuard();
        String[][] block = {
            {"run", "{\"target\":\"workflow\"}"},
            {"run", "{\"target\":\"workflow\"}"},
            {"test_case", "{\"name\":\"高风险订单测试\",\"expected\":[{\"field\":\"orderId\",\"op\":\"exists\"}]}"},
            {"test_case", "{\"name\":\"缺货订单测试\",\"expected\":[{\"field\":\"orderId\",\"op\":\"exists\"}]}"},
            {"run", "{\"target\":\"tests\"}"},
        };
        RepeatToolGuard.Verdict v = RepeatToolGuard.Verdict.none();
        int call = 0;
        for (int round = 1; round <= 3; round++) {
            for (String[] step : block) {
                guard.onModelTurn();
                v = guard.record(step[0], args(step[1]), true, null);
                call++;
                if (call < 10) {
                    assertEquals(RepeatToolGuard.Action.NONE, v.action, "call " + call);
                } else if (call == 10) {
                    assertEquals(RepeatToolGuard.Action.APPEND, v.action);
                    assertTrue(v.message.contains("循环警报") && v.message.contains("周期 5"));
                } else if (call < 15) {
                    assertEquals(RepeatToolGuard.Action.NONE, v.action, "call " + call + " 冷却期不重复提醒");
                }
            }
        }
        assertEquals(RepeatToolGuard.Action.STOP, v.action);
        assertTrue(v.message.contains("终止") && v.message.contains("run → run → test_case → test_case → run"));
    }

    @Test
    @DisplayName("周期 2 交替被警告后再完整重复一轮 → 硬停；换做法则不会")
    void alternatingEscalatesOnlyIfRepeatedAfterWarning() {
        RepeatToolGuard guard = new RepeatToolGuard();
        String edit = "{\"action\":\"update\",\"nodeId\":\"end_1\",\"data\":{\"x\":1}}";
        String run = "{\"target\":\"workflow\"}";
        guard.record("node", args(edit), true, null);
        guard.record("run", args(run), true, null);
        guard.record("node", args(edit), true, null);
        RepeatToolGuard.Verdict warn = guard.record("run", args(run), true, null);
        assertEquals(RepeatToolGuard.Action.APPEND, warn.action);
        assertTrue(warn.message.contains("循环警报"));
        guard.record("node", args(edit), true, null);
        RepeatToolGuard.Verdict stop = guard.record("run", args(run), true, null);
        assertEquals(RepeatToolGuard.Action.STOP, stop.action);

        RepeatToolGuard fresh = new RepeatToolGuard();
        fresh.record("node", args(edit), true, null);
        fresh.record("run", args(run), true, null);
        fresh.record("node", args(edit), true, null);
        assertEquals(RepeatToolGuard.Action.APPEND, fresh.record("run", args(run), true, null).action);
        // 警告后换了参数（真的在修）：不再构成原样循环
        fresh.record("node", args("{\"action\":\"update\",\"nodeId\":\"end_1\",\"data\":{\"x\":2}}"), true, null);
        assertEquals(RepeatToolGuard.Action.NONE, fresh.record("run", args(run), true, null).action);
    }

    @Test
    @DisplayName("回归-实证场景4：每轮并行 get 重读同样 7 个节点、轮轮如此（无新信息）：第 4 轮提醒、第 6 轮硬停")
    void soloReadTurnsWarnThenStop() {
        RepeatToolGuard guard = new RepeatToolGuard();
        String[] nodes = {"start_1", "http_1", "code_2", "condition_3", "llm_4", "http_6", "end_1"};
        for (int turn = 1; turn <= 6; turn++) {
            guard.onModelTurn();
            for (int i = 0; i < nodes.length; i++) {
                RepeatToolGuard.Verdict v = guard.record("get",
                    args("{\"target\":\"node\",\"nodeId\":\"" + nodes[i] + "\"}"), true, null);
                if (turn <= 3) {
                    assertEquals(RepeatToolGuard.Action.NONE, v.action, "turn " + turn + " call " + i);
                } else if (turn < 6) {
                    if (i == 0) {
                        assertEquals(RepeatToolGuard.Action.APPEND, v.action, "turn " + turn + " 首个调用提醒");
                        assertTrue(v.message.contains("只调用 get"));
                    } else {
                        assertEquals(RepeatToolGuard.Action.NONE, v.action, "同轮只提醒一次");
                    }
                } else if (i == 0) {
                    assertEquals(RepeatToolGuard.Action.STOP, v.action);
                    assertTrue(v.message.contains("终止"));
                }
            }
        }
    }

    @Test
    @DisplayName("回归-实证场景5（误杀）：每轮读一个新节点类型契约（skill → get ×N，一轮一个）全程不触发")
    void sequentialDistinctReadsNeverGuarded() {
        RepeatToolGuard guard = new RepeatToolGuard();
        guard.onModelTurn();
        assertEquals(RepeatToolGuard.Action.NONE,
            guard.record("skill", args("{\"name\":\"gaia-workflow-assistant\"}"), true, null).action);
        guard.onModelTurn();
        assertEquals(RepeatToolGuard.Action.NONE,
            guard.record("get", args("{\"target\":\"canvas\"}"), true, null).action);
        for (String type : new String[]{"start", "end", "http", "code", "condition", "llm", "variable", "loop"}) {
            guard.onModelTurn();
            RepeatToolGuard.Verdict v = guard.record("get",
                args("{\"target\":\"knowledge\",\"nodeType\":\"" + type + "\"}"), true, null);
            assertEquals(RepeatToolGuard.Action.NONE, v.action, "nodeType " + type + " 是新信息，不该触发");
        }
    }

    @Test
    @DisplayName("独占轮检测：混入任何其他工具即重置；改状态的工具（node）每轮一个不同目标不受影响")
    void soloTurnsResetOnMixedTurnAndIgnoreMutatingTools() {
        RepeatToolGuard guard = new RepeatToolGuard();
        for (int turn = 1; turn <= 2; turn++) {
            guard.onModelTurn();
            guard.record("get", args("{\"target\":\"node\",\"nodeId\":\"n" + turn + "\"}"), true, null);
        }
        guard.onModelTurn(); // 第 3 轮：get + node 混合 → 重置
        guard.record("get", args("{\"target\":\"canvas\"}"), true, null);
        guard.record("node", args("{\"action\":\"update\",\"nodeId\":\"n1\",\"data\":{\"a\":1}}"), true, null);
        guard.onModelTurn(); // 第 4 轮只 get：独占计数从 1 重新开始，不提醒
        assertEquals(RepeatToolGuard.Action.NONE,
            guard.record("get", args("{\"target\":\"node\",\"nodeId\":\"n9\"}"), true, null).action);

        RepeatToolGuard builder = new RepeatToolGuard();
        for (int turn = 1; turn <= 8; turn++) {
            builder.onModelTurn();
            assertEquals(RepeatToolGuard.Action.NONE, builder.record("node",
                args("{\"action\":\"update\",\"nodeId\":\"node_" + turn + "\",\"data\":{\"t\":1}}"), true, null).action);
        }
    }

    @Test
    @DisplayName("目标实体提取：edge 用 from+port+to，get 用 nodeId/nodeType/target，add 用 items[0].id")
    void entityExtraction() {
        assertEquals("nodeId=end_1", RepeatToolGuard.entityOf(args("{\"target\":\"node\",\"nodeId\":\"end_1\"}")));
        assertEquals("nodeType=http", RepeatToolGuard.entityOf(args("{\"target\":\"knowledge\",\"nodeType\":\"http\"}")));
        assertEquals("target=canvas", RepeatToolGuard.entityOf(args("{\"target\":\"canvas\"}")));
        assertEquals("start_1>else>cond_amount",
            RepeatToolGuard.entityOf(args("{\"action\":\"connect\",\"from\":\"start_1\",\"to\":\"cond_amount\",\"fromPort\":\"else\"}")));
        assertEquals("items[0].id=http_fx",
            RepeatToolGuard.entityOf(args("{\"action\":\"add\",\"items\":[{\"type\":\"http\",\"id\":\"http_fx\"}]}")));
        assertEquals("", RepeatToolGuard.entityOf(args("{\"steps\":[{\"id\":\"1\"}]}")));
    }
}
