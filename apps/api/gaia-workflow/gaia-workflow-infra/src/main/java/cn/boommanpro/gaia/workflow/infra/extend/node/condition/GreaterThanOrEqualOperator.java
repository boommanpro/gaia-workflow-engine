package cn.boommanpro.gaia.workflow.infra.extend.node.condition;

import cn.hutool.core.util.NumberUtil;

import java.math.BigDecimal;

/**
 * 大于等于操作符实现
 */
public class GreaterThanOrEqualOperator implements ConditionOperator<Object> {

    @Override
    public boolean apply(Object left, Object right) {
        // 处理null值情况
        if (left == null || right == null) {
            return false;
        }

        try {
            // 如果类型相同，直接比较
            if (left.getClass().equals(right.getClass()) && left instanceof Comparable) {
                return ((Comparable) left).compareTo(right) >= 0;
            }

            // 尝试进行数字比较
            if (isNumber(left) && isNumber(right)) {
                BigDecimal leftDecimal = convertToBigDecimal(left);
                BigDecimal rightDecimal = convertToBigDecimal(right);
                if (leftDecimal != null && rightDecimal != null) {
                    return leftDecimal.compareTo(rightDecimal) >= 0;
                }
            }

            // 尝试进行字符串比较
            if (left instanceof String && right instanceof String) {
                return ((String) left).compareTo((String) right) >= 0;
            }

            // 其他情况使用toString比较
            return left.toString().compareTo(right.toString()) >= 0;
        } catch (Exception e) {
            // 类型转换失败，返回false
            return false;
        }
    }

    @Override
    public String getOperator() {
        return "gte";
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
