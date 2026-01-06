package cn.boommanpro.gaia.workflow.infra.extend.node.condition;

/**
 * 为假操作符实现
 */
public class IsFalseOperator implements ConditionOperator<Object> {

    private final IsTrueOperator isTrueOperator = new IsTrueOperator();

    @Override
    public boolean apply(Object left, Object right) {
        if (left == null) {
            return false;
        }

        if (left instanceof Boolean) {
            return !(Boolean) left;
        }

        if (left instanceof String) {
            return !Boolean.parseBoolean((String) left);
        }

        // 其他类型，非null且非0数字认为为真
        if (left instanceof Number) {
            return ((Number) left).doubleValue() == 0;
        }

        // 其他非null对象认为为真
        return false;
    }

    @Override
    public String getOperator() {
        return "is_false";
    }

    @Override
    public boolean supportsType(Class<?> type) {
        return true; // 支持所有类型
    }
}
