package cn.boommanpro.gaia.workflow.infra.extend.node.condition;

/**
 * 不等于操作符实现
 */
public class NotEqualOperator implements ConditionOperator<Object> {

    private final EqualOperator equalOperator = new EqualOperator();

    @Override
    public boolean apply(Object left, Object right) {
        // 处理null值情况
        if (left == null && right == null) {
            return false; // 两个都为null，应该相等，所以不等于返回false
        }
        if (left == null || right == null) {
            return true; // 一个为null一个不为null，应该不等，所以返回true
        }

        // 使用EqualOperator的逻辑，然后取反
        return !equalOperator.apply(left, right);
    }

    @Override
    public String getOperator() {
        return "neq";
    }

    @Override
    public boolean supportsType(Class<?> type) {
        return true; // 支持所有类型
    }
}
