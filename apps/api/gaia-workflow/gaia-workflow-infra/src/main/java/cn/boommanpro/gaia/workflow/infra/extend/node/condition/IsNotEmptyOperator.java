package cn.boommanpro.gaia.workflow.infra.extend.node.condition;

/**
 * 不为空操作符实现
 */
public class IsNotEmptyOperator implements ConditionOperator<Object> {

    private final IsEmptyOperator isEmptyOperator = new IsEmptyOperator();

    @Override
    public boolean apply(Object left, Object right) {
        return !isEmptyOperator.apply(left, right);
    }

    @Override
    public String getOperator() {
        return "is_not_empty";
    }

    @Override
    public boolean supportsType(Class<?> type) {
        return true; // 支持所有类型
    }
}
