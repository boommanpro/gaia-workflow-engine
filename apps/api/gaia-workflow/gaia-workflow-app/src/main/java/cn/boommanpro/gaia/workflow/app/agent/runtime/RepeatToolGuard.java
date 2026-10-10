package cn.boommanpro.gaia.workflow.app.agent.runtime;

import cn.hutool.json.JSONObject;
import cn.hutool.json.JSONUtil;

import java.util.HashMap;
import java.util.Map;

/**
 * 同参数重复调用护栏（对齐 dsh repeat-tool-reminder）。
 *
 * <p>同一工具 + 完全相同参数第 3 / 5 / 8 次出现时生成一条 advisory 提醒，
 * 在下一个模型请求前以系统注记注入对话 —— 只提醒不阻断，
 * 把弱模型的复读病理在早期转化为策略调整。</p>
 */
public class RepeatToolGuard {

    /** 触发提醒的重复次数阶梯（dsh 同款 3/5/8） */
    private static final int[] REMINDER_AT = {3, 5, 8};

    private final Map<String, Integer> counts = new HashMap<>();

    /**
     * 登记一次调用。
     *
     * @return 若本次触发提醒阈值，返回提醒文本；否则返回 null
     */
    public String record(String toolName, JSONObject args) {
        String key = toolName + "|" + canonicalArgs(args);
        int count = counts.merge(key, 1, Integer::sum);
        for (int threshold : REMINDER_AT) {
            if (count == threshold) {
                return "你已用完全相同的参数第 " + count + " 次调用 " + toolName
                    + "，且没有得到期望的结果。同样的输入通常只会得到同样的输出——"
                    + "请改变策略：换工具、修参数，或直接用正文向用户说明遇到的困难。";
            }
        }
        return null;
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
}
