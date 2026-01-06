package cn.boommanpro.gaia.workflow.infra.extend.node.condition;

/**
 * 不包含操作符实现
 */
public class NotContainsOperator implements ConditionOperator<Object> {

    private final ContainsOperator containsOperator = new ContainsOperator();

    @Override
    public boolean apply(Object left, Object right) {
        return !containsOperator.apply(left, right);
    }

    @Override
    public String getOperator() {
        return "not_contains";
    }

    @Override
    public boolean supportsType(Class<?> type) {
        return true;
    }
}
