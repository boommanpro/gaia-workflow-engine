package cn.boommanpro.gaia.workflow.app.service;

import cn.hutool.json.JSONObject;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * 思考模式参数规划器（对标 owb src/core/model/thinking.js）。
 *
 * <p>五档 auto/off/low/medium/high，按厂商映射为实际请求参数。三条红线照抄 owb：
 * ① auto 一个参数都不发（保持模型默认，零行为变化）；② 认不出的厂商不乱发参数
 * （400 比开关没生效更糟，返回 note 让前端灰置）；③ 关不到零就如实说（note 说明）。</p>
 */
@Slf4j
@Component
public class ThinkingParamPlanner {

    public static final String AUTO = "auto";
    public static final String OFF = "off";
    public static final String LOW = "low";
    public static final String MEDIUM = "medium";
    public static final String HIGH = "high";

    /** 档位 → AgentScope GenerateOptions 可用的两个思考参数（thinkingBudget / reasoningEffort） */
    public static class Plan {
        public final String level;
        public final boolean supported;
        /** 思考预算（anthropic budget_tokens / qwen thinking_budget 系） */
        public final Integer budgetTokens;
        /** 推理努力档（openai reasoning_effort / openrouter effort 系，直接用档位值） */
        public final String reasoningEffort;
        /** 给前端的说明（为什么不支持/关不到零等） */
        public final String note;

        public Plan(String level, boolean supported, Integer budgetTokens, String reasoningEffort, String note) {
            this.level = level;
            this.supported = supported;
            this.budgetTokens = budgetTokens;
            this.reasoningEffort = reasoningEffort;
            this.note = note;
        }
    }

    /** 五个档位（前端下拉顺序） */
    public static String[] levels() {
        return new String[]{AUTO, OFF, LOW, MEDIUM, HIGH};
    }

    /**
     * 规划思考参数。
     *
     * @param vendor 厂商标识（llm_model.vendor；空则按 modelId 猜）
     * @param modelId 上游模型 ID
     * @param level 档位
     */
    public Plan plan(String vendor, String modelId, String level) {
        String lv = (level == null || level.isEmpty()) ? AUTO : level.toLowerCase();
        if (AUTO.equals(lv)) {
            return new Plan(lv, true, null, null, "跟随模型默认行为，不发送任何思考参数");
        }
        String vendorKey = resolveVendor(vendor, modelId);
        if (vendorKey == null) {
            return new Plan(lv, false, null, null,
                "未识别的厂商/模型，不自动发送思考参数；如需强制请在该模型的 extra_body 手工填写");
        }
        boolean on = !OFF.equals(lv);
        int budget = LOW.equals(lv) ? 4096 : (MEDIUM.equals(lv) ? 10240 : 24576);
        return switch (vendorKey) {
            // thinkingBudget 系：budget 数值随档位缩放；off 档发 0（引擎层不下发）
            case "qwen" -> new Plan(lv, true, on ? budget : 0, null,
                on ? "" : "qwen 思考关闭依赖部署侧 enable_thinking 支持，vLLM/DashScope 兼容性请以实测为准");
            case "anthropic" -> (modelId != null && modelId.toLowerCase().contains("claude"))
                ? new Plan(lv, true, on ? budget : null, null, on ? "" : "Claude 无关闭参数，off 等价最低档")
                : new Plan(lv, false, null, null, "仅 Claude 系模型支持 thinking 参数");
            case "deepseek" -> (modelId != null && modelId.toLowerCase().contains("reasoner"))
                ? new Plan(lv, false, null, null, "deepseek-reasoner 恒开思考，无法关闭")
                : new Plan(lv, true, on ? budget : 0, null, "");
            // reasoningEffort 系：直接传档位；OpenAI off 档发 minimal（关不到零，如实说明）
            case "openai" -> new Plan(lv, true, null, on ? lv : "minimal",
                on ? "" : "OpenAI 推理模型没有完全关闭思考的参数，off 档发送 minimal（最低档）");
            case "openrouter" -> new Plan(lv, true, null, on ? lv : null, "");
            case "glm" -> new Plan(lv, true, on ? budget : 0, null, "");
            default -> new Plan(lv, false, null, null, "该厂商暂无思考参数映射，可在 extra_body 手工填写");
        };
    }

    /** 厂商标识归一：显式 vendor 优先，否则按模型名/网关域名猜 */
    String resolveVendor(String vendor, String modelId) {
        if (vendor != null && !vendor.isEmpty() && !"custom".equalsIgnoreCase(vendor)) {
            return vendor.toLowerCase();
        }
        String m = modelId == null ? "" : modelId.toLowerCase();
        if (m.startsWith("qwen") || m.startsWith("qwq")) {
            return "qwen";
        }
        if (m.startsWith("glm")) {
            return "glm";
        }
        if (m.startsWith("claude")) {
            return "anthropic";
        }
        if (m.startsWith("deepseek")) {
            return "deepseek";
        }
        if (m.startsWith("gpt-5") || m.startsWith("o1") || m.startsWith("o3") || m.startsWith("o4")) {
            return "openai";
        }
        return null;
    }
}
