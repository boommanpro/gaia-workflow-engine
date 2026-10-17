package cn.boommanpro.gaia.workflow.app.agent.runtime;

import cn.hutool.json.JSONObject;
import cn.hutool.json.JSONUtil;
import cn.boommanpro.gaia.workflow.app.agent.tool.ToolErrorCode;

import java.util.HashMap;
import java.util.Map;

/**
 * 同参数重复调用护栏（对齐 dsh repeat-tool-reminder，含本轮实测补强）。
 *
 * <p>判定键 = 工具名 + 规范化参数（键排序后序列化）。任何一次不同参数的调用
 * 都会重置链（换参 = 模型在尝试新策略）；同一键连续出现时按阶梯升级：</p>
 *
 * <ul>
 *   <li><b>第 2 次</b>：结果上附加温和提醒（不覆盖原结果——violations 里的
 *       path/fix 才是模型自修复的依据，覆盖它等于蒙住模型的眼睛）；</li>
 *   <li><b>第 3 次且仍 INVALID_ARGS</b>：硬熔断——2026-10-10 实测本地 Qwen 对
 *       同一 INVALID_ARGS 同参复读 8~67 次且完全无视提醒文本，advisory 挡不住，
 *       必须终止本轮。返回 STOP 信号由引擎收尾（合成收尾消息 + 事件广播）；</li>
 *   <li><b>3/5/8 次（非 INVALID_ARGS）</b>：附加详细升级提醒（dsh 同款文案）。</li>
 * </ul>
 */
public class RepeatToolGuard {

    /** 非 INVALID_ARGS 复读的提醒阶梯（dsh 同款 3/5/8） */
    private static final int[] REMINDER_AT = {3, 5, 8};

    /** INVALID_ARGS 同参数硬熔断阈值 */
    public static final int INVALID_ARGS_HARD_STOP_AT = 3;

    /** 护栏动作：附加提醒 / 硬熔断 */
    public enum Action { NONE, APPEND, STOP }

    /** 一次登记的裁决结果 */
    public static class Verdict {
        public final Action action;
        public final String message;

        private Verdict(Action action, String message) {
            this.action = action;
            this.message = message;
        }

        static Verdict none() {
            return new Verdict(Action.NONE, null);
        }
    }

    /** 失败复读计数：同参数组合的累计失败次数（只有同 key 成功才清零） */
    private final Map<String, Integer> failCounts = new HashMap<>();

    /** 成功复读计数：同参数组合的连续成功次数（检测语法成功但语义空转） */
    private final Map<String, Integer> successCounts = new HashMap<>();

    /**
     * 登记一次调用及其结果。
     *
     * @param toolName  工具名
     * @param args      本次参数
     * @param success   执行是否成功
     * @param errorCode 失败错误码（成功时为 null）
     */
    /** 同工具连续调用提醒阈值（不看参数：todo_write 变参循环 2026-10-11 实证绕过同参护栏） */
    private static final int SAME_TOOL_STREAK_REMIND_AT = 4;

    /** 同工具连续调用硬熔断阈值（微变参循环无视提醒时终止：write 空壳复读实证） */
    private static final int SAME_TOOL_STREAK_HARD_STOP_AT = 6;

    private String lastToolName;
    private int sameToolStreak;

    public Verdict record(String toolName, JSONObject args, boolean success, ToolErrorCode errorCode) {
        String key = toolName + "|" + canonicalArgs(args);
        recordKey(key);
        // 同工具连续调用（参数可变）：todo_write 这类全量重写工具每次参数都不同，
        // 同参护栏抓不住；连续 N 次同一工具就该提醒换路
        boolean streakTriggered = false;
        boolean streakHardStop = false;
        if (toolName.equals(lastToolName)) {
            sameToolStreak++;
            if (sameToolStreak == SAME_TOOL_STREAK_REMIND_AT) {
                streakTriggered = true;
            }
            if (sameToolStreak >= SAME_TOOL_STREAK_HARD_STOP_AT) {
                streakHardStop = true;
            }
        } else {
            lastToolName = toolName;
            sameToolStreak = 1;
        }
        if (success) {
            // 成功不再无条件打破重复链（2026-10-11 实证：模型同参 edit 成功 8 次——
            // 语法成功不等于语义进展，连环空转由 alternating-loop 检测兜住）。
            // 成功计数独立起算（前序失败链不并入成功复读的次数）。
            int count;
            if (key.equals(lastKey) && lastWasSuccess) {
                count = successCounts.getOrDefault(key, 0) + 1;
            } else {
                count = 1;
            }
            successCounts.put(key, count);
            failCounts.remove(key); // 该参数组合已成功：失败链清零
            lastKey = key;
            lastWasSuccess = true;
            if (count >= SUCCESS_REPEAT_REMIND_AT) {
                return new Verdict(Action.APPEND, "你已连续第 " + count + " 次用完全相同的参数成功调用 "
                    + toolName + "，结果不会有任何变化。请先 get(target=canvas) / get(target=variables) 核实现状，"
                    + "换一种修改或直接向用户说明。");
            }
            if (streakHardStop) {
                return new Verdict(Action.STOP,
                    "⚠️ 系统护栏：你已连续 " + sameToolStreak + " 次成功调用 " + toolName
                        + "（参数反复微调）而没有推进任务，本轮执行已被终止。"
                        + "请核对当前状态后用正文总结进度与下一步。");
            }
            if (streakTriggered) {
                return new Verdict(Action.APPEND,
                    "你已连续 " + sameToolStreak + " 次调用 " + toolName
                        + "（参数各不相同）。如果是清单类工具（todo_write）这是不必要的反复重写——"
                        + "清单一次写全，然后去执行清单里的步骤；如果是查询类，连续查询说明你在绕圈，"
                        + "停下来用 get(target=canvas) 看现状或换一种做法。");
            }
            if (alternatingLoopJustTriggered) {
                alternatingLoopJustTriggered = false;
                return new Verdict(Action.APPEND, ALTERNATING_LOOP_MESSAGE);
            }
            return Verdict.none();
        }
        // 失败计数不再被「中间夹的其他调用」重置（2026-10-11 三轮实证：write 失败 →
        // edit/read 失败 → write 同参复读，复读链被 edit/read 清零，第 2/3 次阶梯提醒
        // 全部失位）。同 key 失败累计，只有该 key 成功才清零。
        lastKey = key;
        lastWasSuccess = false;
        int count = failCounts.getOrDefault(key, 0) + 1;
        failCounts.put(key, count);

        boolean invalidArgs = errorCode == ToolErrorCode.INVALID_ARGS;
        if (streakHardStop) {
            return new Verdict(Action.STOP,
                "⚠️ 系统护栏：你已连续 " + sameToolStreak + " 次调用 " + toolName
                    + "（参数反复微调）且一直失败，本轮执行已被终止以避免空转。\n\n"
                    + "已生效的改动保持有效。继续推进请换一种方式：先用 get(target=canvas) / get(target=variables) "
                    + "核对现状，或把回执里的可抄示例逐字段比对后一次性修正重发；"
                    + "若仍无法修正，直接说明你需要用户提供什么。");
        }
        if (invalidArgs && count >= INVALID_ARGS_HARD_STOP_AT) {
            return new Verdict(Action.STOP, hardStopMessage(toolName, count));
        }
        if (invalidArgs && count == 2) {
            return new Verdict(Action.APPEND,
                "你已第 2 次用完全相同的参数调用 " + toolName + " 并得到同样的 INVALID_ARGS。"
                    + "同样的输入只会得到同样的输出：请先读懂 error.violations 里每一项的 fix，"
                    + "改完参数再调用；改不动就用 get(target=canvas) 查看现状，或直接向用户提问。");
        }
        if (!invalidArgs) {
            for (int threshold : REMINDER_AT) {
                if (count == threshold) {
                    return new Verdict(Action.APPEND, reminder(toolName, count));
                }
            }
        }
        if (alternatingLoopJustTriggered) {
            alternatingLoopJustTriggered = false;
            return new Verdict(Action.APPEND, ALTERNATING_LOOP_MESSAGE);
        }
        return Verdict.none();
    }

    /**
     * 记录调用序列并识别 edit→run 交替空转：修改+验证循环里结果没有任何变化
     * （2026-10-11 二轮实证：模型 edit end_1 → run 交替 8 轮，每次 edit 参数略有
     * 不同所以按 key 检测抓不住，只有序列模式能识别）。末尾 k1,k2,k1,k2 即触发。
     */
    private void recordKey(String key) {
        recentKeys.addLast(key);
        while (recentKeys.size() > 8) {
            recentKeys.removeFirst();
        }
        if (alternatingLoopJustTriggered) {
            return;
        }
        int n = recentKeys.size();
        if (n >= 4) {
            String[] arr = recentKeys.toArray(new String[0]);
            String k1 = arr[n - 4], k2 = arr[n - 3], k3 = arr[n - 2], k4 = arr[n - 1];
            if (!k1.equals(k2) && k1.equals(k3) && k2.equals(k4)) {
                alternatingLoopJustTriggered = true;
            }
        }
    }

    /** 交替空转提醒是否待附加（检测到后在下一次 record 结果上带出） */
    private boolean alternatingLoopJustTriggered;

    /** 最近调用 key 序列（含成功调用），交替空转检测用 */
    private final java.util.ArrayDeque<String> recentKeys = new java.util.ArrayDeque<>();

    /** 同参数成功复读的提醒阈值 */
    private static final int SUCCESS_REPEAT_REMIND_AT = 3;

    /** 交替空转提醒文案 */
    public static final String ALTERNATING_LOOP_MESSAGE =
        "循环警报：你已陷入「修改→运行」的交替循环且运行结果没有变化，继续这样调用不会有进展。"
            + "请停下来：get(target=canvas) 查看当前结构，对照运行回执里的 warnings 定位真正没生效的"
            + "节点/字段（warnings 会点名字段和上游），只修那一处；或换一种节点结构；或直接向用户说明困难。";

    /** 非参数错误复读的升级提醒（dsh 同款文案结构） */
    private static String reminder(String toolName, int count) {
        return "复读警报：你已用完全相同的参数第 " + count + " 次调用 " + toolName
            + "，且没有得到期望的结果。这些调用没有产生任何进展。"
            + "请仔细检查最近一次结果，换一种行动：修改参数、改用其他工具，"
            + "或直接用正文向用户说明遇到的困难。不要再用这组参数调用。";
    }

    /** INVALID_ARGS 硬熔断收尾文案（会作为本轮结束的助手消息落库） */
    private static String hardStopMessage(String toolName, int count) {
        return "⚠️ 系统护栏：你已连续 " + count + " 次用完全相同的参数调用 " + toolName
            + " 并得到 INVALID_ARGS，本轮执行已被终止以避免空转。\n\n"
            + "已生效的改动保持有效（成功的工具调用不会回滚）。继续推进请换一种方式："
            + "先用 get(target=canvas / variables / knowledge) 核对现状，"
            + "按最近一次 error.violations 的 fix 逐项修正参数后重试；"
            + "若仍无法修正，直接说明你需要用户提供什么。";
    }

    /** 参数规范化：键排序后序列化，保证等价参数产生同一 key */
    private static String canonicalArgs(JSONObject args) {
        if (args == null || args.isEmpty()) {
            return "{}";
        }
        try {
            return JSONUtil.toJsonStr(sortKeys(args));
        } catch (Exception e) {
            return String.valueOf(args);
        }
    }

    private static JSONObject sortKeys(JSONObject obj) {
        JSONObject sorted = new JSONObject(true);
        obj.keySet().stream().sorted().forEach(k -> sorted.set(k, obj.get(k)));
        return sorted;
    }

    private String lastKey;

    /** 上一次调用是否成功（成功/失败复读链分开计数） */
    private boolean lastWasSuccess;
}
