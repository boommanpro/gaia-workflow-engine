package cn.boommanpro.gaia.workflow.app.agent.tool;

import cn.hutool.json.JSONArray;
import cn.hutool.json.JSONObject;
import lombok.Data;

import java.util.ArrayList;
import java.util.List;

/**
 * 工具参数校验器 —— JSON Schema 子集的运行时校验（对齐 dsh「schema 不只发给模型，也用于执行前校验」）。
 *
 * <p>支持的关键字：{@code type / properties / required / enum / items / minLength / minItems}。
 * 不追求完整 JSON Schema 规范，只覆盖 {@code AgentToolRegistry} 建种时实际使用的子集 ——
 * 校验器的职责是把「模型自由发挥的参数」在进入执行器之前拦下，并给出 path 级修复指引。</p>
 */
public final class ToolArgsValidator {

    private ToolArgsValidator() {
    }

    /** 一处违规：path 定位 + 问题 + 修复建议 */
    @Data
    public static class Violation {
        private final String path;
        private final String issue;
        private final String fix;

        public Violation(String path, String issue, String fix) {
            this.path = path;
            this.issue = issue;
            this.fix = fix;
        }
    }

    /**
     * 校验 args 是否符合 schema。
     *
     * @param schema 工具的 parameters JSON Schema（object 类型）
     * @param args   模型给出的参数
     * @return 违规清单；空列表表示通过
     */
    public static List<Violation> validate(JSONObject schema, JSONObject args) {
        List<Violation> violations = new ArrayList<>();
        if (schema == null) {
            return violations;
        }
        JSONObject target = args != null ? args : new JSONObject();
        validateObject(schema, target, "", violations);
        return violations;
    }

    private static void validateObject(JSONObject schema, JSONObject value, String path, List<Violation> out) {
        JSONObject properties = schema.getJSONObject("properties");
        JSONArray required = schema.getJSONArray("required");

        if (required != null) {
            for (int i = 0; i < required.size(); i++) {
                String name = required.getStr(i);
                if (name != null && !value.containsKey(name)) {
                    out.add(new Violation(child(path, name), "缺少必填参数",
                        descOf(properties, name) != null
                            ? "补上 " + name + "：" + descOf(properties, name)
                            : "补上必填参数 " + name));
                }
            }
        }
        if (properties == null) {
            return;
        }
        for (String name : properties.keySet()) {
            if (!value.containsKey(name) || value.get(name) == null) {
                continue;
            }
            validateValue(properties.getJSONObject(name), value.get(name), child(path, name), out);
        }
    }

    private static void validateValue(JSONObject propSchema, Object value, String path, List<Violation> out) {
        if (propSchema == null) {
            return;
        }
        String type = propSchema.getStr("type");
        JSONArray allowed = propSchema.getJSONArray("enum");

        if (allowed != null && !containsValue(allowed, value)) {
            out.add(new Violation(path, "取值不在枚举范围内（收到 " + preview(value) + "）",
                "从以下值中选择：" + allowed.join(",")));
            return;
        }
        if (type == null) {
            return;
        }
        switch (type) {
            case "string": {
                if (!(value instanceof String)) {
                    out.add(new Violation(path, "应为 string，收到 " + typeName(value),
                        "把它改成字符串" + (allowed != null ? "（枚举：" + allowed.join(",") + "）" : "")));
                    return;
                }
                Integer minLength = propSchema.getInt("minLength");
                if (minLength != null && ((String) value).trim().length() < minLength) {
                    out.add(new Violation(path, "字符串长度不足 " + minLength, "填写非空内容"));
                }
                break;
            }
            case "number":
            case "integer": {
                if (!(value instanceof Number)) {
                    // 宽容：数字字符串可转则转，不记违规（弱模型常发 "1" 而非 1）
                    if (value instanceof String) {
                        try {
                            Double.parseDouble((String) value);
                            break;
                        } catch (NumberFormatException ignore) {
                            // fallthrough 记违规
                        }
                    }
                    out.add(new Violation(path, "应为数字，收到 " + typeName(value), "改成数字（不要加引号）"));
                }
                break;
            }
            case "boolean": {
                if (!(value instanceof Boolean)) {
                    if ("true".equals(value) || "false".equals(value)) {
                        break;
                    }
                    out.add(new Violation(path, "应为 boolean，收到 " + typeName(value), "用 true / false（不要加引号）"));
                }
                break;
            }
            case "object": {
                if (!(value instanceof JSONObject)) {
                    out.add(new Violation(path, "应为对象 {}，收到 " + typeName(value), "改成 JSON 对象"));
                    return;
                }
                validateObject(propSchema, (JSONObject) value, path, out);
                break;
            }
            case "array": {
                if (!(value instanceof JSONArray)) {
                    out.add(new Violation(path, "应为数组 []，收到 " + typeName(value), "改成 JSON 数组"));
                    return;
                }
                JSONArray array = (JSONArray) value;
                Integer minItems = propSchema.getInt("minItems");
                if (minItems != null && array.size() < minItems) {
                    out.add(new Violation(path, "数组至少需要 " + minItems + " 项（收到 " + array.size() + " 项）",
                        "补全数组元素"));
                }
                JSONObject items = propSchema.getJSONObject("items");
                if (items != null) {
                    for (int i = 0; i < array.size(); i++) {
                        Object item = array.get(i);
                        String itemPath = path + "[" + i + "]";
                        if (item instanceof JSONObject) {
                            validateObject(items, (JSONObject) item, itemPath, out);
                        } else if ("object".equals(items.getStr("type")) || items.getJSONObject("properties") != null) {
                            out.add(new Violation(itemPath, "数组元素应为对象 {}", "改成 JSON 对象"));
                        }
                    }
                }
                break;
            }
            default:
                break;
        }
    }

    private static boolean containsValue(JSONArray allowed, Object value) {
        for (int i = 0; i < allowed.size(); i++) {
            Object candidate = allowed.get(i);
            if (candidate == null) {
                continue;
            }
            if (candidate.equals(value) || String.valueOf(candidate).equals(String.valueOf(value))) {
                return true;
            }
        }
        return false;
    }

    private static String descOf(JSONObject properties, String name) {
        if (properties == null) {
            return null;
        }
        JSONObject prop = properties.getJSONObject(name);
        return prop != null ? prop.getStr("description") : null;
    }

    private static String child(String path, String name) {
        return path == null || path.isEmpty() ? name : path + "." + name;
    }

    private static String preview(Object value) {
        String text = String.valueOf(value);
        return text.length() > 40 ? text.substring(0, 40) + "…" : text;
    }

    private static String typeName(Object value) {
        if (value == null) {
            return "null";
        }
        if (value instanceof JSONObject) {
            return "object";
        }
        if (value instanceof JSONArray) {
            return "array";
        }
        if (value instanceof Number) {
            return "number";
        }
        if (value instanceof Boolean) {
            return "boolean";
        }
        return "string";
    }
}
