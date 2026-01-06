package cn.boommanpro.gaia.workflow.infra.extend.node.condition;

import cn.hutool.core.util.NumberUtil;

import java.math.BigDecimal;

/**
 * 等于操作符实现
 */
public class EqualOperator implements ConditionOperator<Object> {

    @Override
    public boolean apply(Object left, Object right) {
        // 处理null值情况
        if (left == null && right == null) {
            return true;
        }
        if (left == null || right == null) {
            return false;
        }

        // 如果类型相同，直接比较
        if (left.getClass().equals(right.getClass())) {
            return left.equals(right);
        }

        // 尝试进行类型转换后比较
        return compareWithConversion(left, right);
    }

    @Override
    public String getOperator() {
        return "eq";
    }

    @Override
    public boolean supportsType(Class<?> type) {
        return true; // 支持所有类型
    }

    /**
     * 尝试进行类型转换后比较
     *
     * @param left  左操作数
     * @param right 右操作数
     * @return 比较结果
     */
    private boolean compareWithConversion(Object left, Object right) {
        try {
            // 字符串与数字比较
            if (isNumber(left) && isString(right)) {
                return new BigDecimal(left.toString()).compareTo(new BigDecimal((String) right)) == 0;
            }
            if (isString(left) && isNumber(right)) {
                return new BigDecimal((String) left).compareTo(new BigDecimal(right.toString())) == 0;
            }

            // 布尔值比较
            if (isBoolean(left) && isString(right)) {
                return left.equals(Boolean.parseBoolean((String) right));
            }
            if (isString(left) && isBoolean(right)) {
                return Boolean.parseBoolean((String) left) == (Boolean) right;
            }

            // 其他情况使用toString比较
            return left.toString().equals(right.toString());
        } catch (Exception e) {
            // 类型转换失败，使用toString比较
            return left.toString().equals(right.toString());
        }
    }

    /**
     * 判断对象是否为数字类型
     *
     * @param obj 对象
     * @return 是否为数字
     */
    private boolean isNumber(Object obj) {
        return obj instanceof Number ||
               (obj instanceof String && NumberUtil.isNumber((String) obj));
    }

    /**
     * 判断对象是否为字符串类型
     *
     * @param obj 对象
     * @return 是否为字符串
     */
    private boolean isString(Object obj) {
        return obj instanceof String;
    }

    /**
     * 判断对象是否为布尔类型
     *
     * @param obj 对象
     * @return 是否为布尔值
     */
    private boolean isBoolean(Object obj) {
        return obj instanceof Boolean ||
               (obj instanceof String && ("true".equalsIgnoreCase((String) obj) || "false".equalsIgnoreCase((String) obj)));
    }
}
