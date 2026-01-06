package cn.boommanpro.gaia.workflow.infra.extend.node.condition;

import java.util.Map;
import java.util.HashMap;

/**
 * 条件操作符工厂类，用于管理和获取操作符实现
 */
public class ConditionOperatorFactory {

    private static final Map<String, ConditionOperator<?>> operators = new HashMap<>();

    static {
        // 初始化所有操作符实现
        registerOperator(new EqualOperator());
        registerOperator(new NotEqualOperator());
        registerOperator(new GreaterThanOperator());
        registerOperator(new GreaterThanOrEqualOperator());
        registerOperator(new LessThanOperator());
        registerOperator(new LessThanOrEqualOperator());
        registerOperator(new IsEmptyOperator());
        registerOperator(new IsNotEmptyOperator());
        registerOperator(new IsTrueOperator());
        registerOperator(new IsFalseOperator());
        registerOperator(new ContainsOperator());
        registerOperator(new NotContainsOperator());
    }

    /**
     * 注册操作符实现
     *
     * @param operator 操作符实现
     */
    public static void registerOperator(ConditionOperator<?> operator) {
        operators.put(operator.getOperator(), operator);
    }

    /**
     * 根据操作符名称获取操作符实现
     *
     * @param operatorName 操作符名称
     * @return 操作符实现
     */
    @SuppressWarnings("unchecked")
    public static <T> ConditionOperator<T> getOperator(String operatorName) {
        return (ConditionOperator<T>) operators.get(operatorName);
    }

    /**
     * 检查是否存在指定的操作符
     *
     * @param operatorName 操作符名称
     * @return 是否存在
     */
    public static boolean containsOperator(String operatorName) {
        return operators.containsKey(operatorName);
    }
}
