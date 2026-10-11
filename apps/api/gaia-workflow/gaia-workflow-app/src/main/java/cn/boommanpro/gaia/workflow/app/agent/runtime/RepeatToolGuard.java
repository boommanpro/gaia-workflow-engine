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

    private final Map<String, Integer> counts = new HashMap<>();

    /**
     * 登记一次调用及其结果。
     *
     * @param toolName  工具名
     * @param args      本次参数
     * @param success   执行是否成功
     * @param errorCode 失败错误码（成功时为 null）
     */
    public Verdict record(String toolName, JSONObject args, boolean success, ToolErrorCode errorCode) {
        String key = toolName + "|" + canonicalArgs(args);
        if (success) {
            // 成功即打破重复链：这组参数已经生效，后续同名调用是新的意图
            counts.remove(key);
            if (key.equals(lastKey)) {
                lastKey = null;
            }
            return Verdict.none();
        }
        boolean sameAsLast = key.equals(lastKey);
        lastKey = key;
        int count = sameAsLast ? counts.getOrDefault(key, 0) + 1 : 1;
        counts.put(key, count);

        boolean invalidArgs = errorCode == ToolErrorCode.INVALID_ARGS;
        if (invalidArgs && count >= INVALID_ARGS_HARD_STOP_AT) {
            return new Verdict(Action.STOP, hardStopMessage(toolName, count));
        }
        if (invalidArgs && count == 2) {
            return new Verdict(Action.APPEND,
                "你已第 2 次用完全相同的参数调用 " + toolName + " 并得到同样的 INVALID_ARGS。"
                    + "同样的输入只会得到同样的输出：请先读懂 error.violations 里每一项的 fix，"
                    + "改完参数再调用；改不动就用 read_workflow / read_node 查看现状，或直接向用户提问。");
        }
        if (!invalidArgs) {
            for (int threshold : REMINDER_AT) {
                if (count == threshold) {
                    return new Verdict(Action.APPEND, reminder(toolName, count));
                }
            }
        }
        return Verdict.none();
    }

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
            + "先用 read_workflow / read_node / get_node_schema 核对现状，"
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
}
