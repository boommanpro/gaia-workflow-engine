package cn.boommanpro.gaia.workflow.app.service;

import cn.hutool.json.JSONArray;
import cn.hutool.json.JSONObject;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * 测试断言评估器（决策点 D5）：exists / equals / contains 三算子起步。
 * 每条断言产出 {field, op, expected, actual, pass}，全部通过 = 用例 passed。
 */
@Component
public class TestAssertEvaluator {

    /** 单条断言结果 */
    public static final class AssertResult {
        public final String field;
        public final String op;
        public final Object expected;
        public final Object actual;
        public final boolean pass;

        public AssertResult(String field, String op, Object expected, Object actual, boolean pass) {
            this.field = field;
            this.op = op;
            this.expected = expected;
            this.actual = actual;
            this.pass = pass;
        }
    }

    /**
     * @param expected [{"field":"output","op":"exists|equals|contains","value":...}]
     * @param actual   节点 outputs 或工作流 end 输出
     */
    public List<AssertResult> evaluate(JSONArray expected, Map<String, Object> actual) {
        List<AssertResult> results = new ArrayList<>();
        if (expected == null) {
            return results;
        }
        for (int i = 0; i < expected.size(); i++) {
            JSONObject assertion = expected.getJSONObject(i);
            if (assertion == null) {
                continue;
            }
            String field = assertion.getStr("field");
            String op = assertion.getStr("op", "exists");
            Object expectedValue = assertion.get("value");
            Object actualValue = actual != null ? resolveField(actual, field) : null;
            results.add(new AssertResult(field, op, expectedValue, actualValue, check(op, expectedValue, actualValue)));
        }
        return results;
    }

    /** 支持 a.b 一层点路径兜底 */
    @SuppressWarnings("unchecked")
    private Object resolveField(Map<String, Object> actual, String field) {
        if (field == null || !field.contains(".")) {
            return actual.get(field);
        }
        int dot = field.indexOf('.');
        Object nested = actual.get(field.substring(0, dot));
        return nested instanceof Map ? ((Map<String, Object>) nested).get(field.substring(dot + 1)) : null;
    }

    private boolean check(String op, Object expected, Object actualValue) {
        switch (op == null ? "exists" : op) {
            case "exists":
                return actualValue != null && !(actualValue instanceof String && ((String) actualValue).isEmpty());
            case "equals":
                if (actualValue == null) {
                    return expected == null;
                }
                if (expected == null) {
                    return false;
                }
                if (actualValue.equals(expected)) {
                    return true;
                }
                // 数值宽匹配（1 vs 1.0）
                return isNumber(actualValue) && isNumber(expected)
                    && Double.parseDouble(String.valueOf(actualValue))
                        == Double.parseDouble(String.valueOf(expected));
            case "contains":
                if (actualValue == null || expected == null) {
                    return false;
                }
                if (actualValue instanceof String) {
                    return ((String) actualValue).contains(String.valueOf(expected));
                }
                if (actualValue instanceof Iterable) {
                    for (Object item : (Iterable<?>) actualValue) {
                        if (String.valueOf(item).equals(String.valueOf(expected))) {
                            return true;
                        }
                    }
                }
                return String.valueOf(actualValue).contains(String.valueOf(expected));
            default:
                return false;
        }
    }

    private boolean isNumber(Object value) {
        return value instanceof Number
            || (value instanceof String && ((String) value).matches("-?\\d+(\\.\\d+)?"));
    }
}
