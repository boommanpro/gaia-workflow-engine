package cn.boommanpro.gaia.workflow.infra.extend.node.condition;

import cn.hutool.core.util.NumberUtil;

import java.math.BigDecimal;

/**
 * 大于操作符实现
 */
public class GreaterThanOperator implements ConditionOperator<Object> {

    @Override
    public boolean apply(Object left, Object right) {
        // 处理null值情况
        if (left == null || right == null) {
            return false;
        }

        // 尝试进行类型转换
        try {
            Object convertedLeft = convertToComparable(left);
            Object convertedRight = convertToComparable(right);

            if (isNumber(convertedLeft) && isNumber(convertedRight)) {
                BigDecimal leftDecimal = convertToBigDecimal(convertedLeft);
                BigDecimal rightDecimal = convertToBigDecimal(convertedRight);
                if (leftDecimal != null && rightDecimal != null) {
                    return leftDecimal.compareTo(rightDecimal) > 0;
                }
            }
            // 类型不同且不能转换为数字，无法比较
            return false;

        } catch (Exception e) {
            // 类型转换失败，返回false
            return false;
        }
    }

    @Override
    public String getOperator() {
        return "gt";
    }

    @Override
    public boolean supportsType(Class<?> type) {
        return Number.class.isAssignableFrom(type) ||
               String.class.isAssignableFrom(type) ||
               type == int.class ||
               type == long.class ||
               type == float.class ||
               type == double.class ||
               type == boolean.class ||
               type == char.class ||
               Comparable.class.isAssignableFrom(type);
    }

    /**
     * 将对象转换为可比较的对象
     *
     * @param obj 对象
     * @return 可比较的对象
     */
    private Object convertToComparable(Object obj) {
        if (obj instanceof Comparable) {
            return obj;
        }

        if (obj instanceof String) {
            String str = (String) obj;
            // 尝试转换为数字
            if (NumberUtil.isNumber(str)) {
                // 尝试转换为整数
                if (str.contains(".")) {
                    return new BigDecimal(str);
                } else {
                    try {
                        return Long.parseLong(str);
                    } catch (NumberFormatException e) {
                        return new BigDecimal(str);
                    }
                }
            }
        }

        // 无法转换，返回原对象
        return obj;
    }

    /**
     * 判断对象是否为数字
     */
    private boolean isNumber(Object obj) {
        return obj instanceof Number ||
               (obj instanceof String && NumberUtil.isNumber((String) obj));
    }

    /**
     * 将对象转换为BigDecimal
     */
    private BigDecimal convertToBigDecimal(Object obj) {
        try {
            if (obj instanceof Number) {
                return new BigDecimal(obj.toString());
            } else if (obj instanceof String && NumberUtil.isNumber((String) obj)) {
                return new BigDecimal((String) obj);
            }
            return null;
        } catch (Exception e) {
            return null;
        }
    }
}
