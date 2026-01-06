package cn.boommanpro.gaia.workflow.infra.extend.node.condition;

/**
 * 条件操作符接口，用于定义各种操作符的处理逻辑
 *
 * @param <T> 操作数类型
 */
public interface ConditionOperator<T> {

    /**
     * 执行操作符比较
     *
     * @param left  左操作数
     * @param right 右操作数
     * @return 比较结果
     */
    boolean apply(T left, T right);

    /**
     * 获取操作符名称
     *
     * @return 操作符名称
     */
    String getOperator();

    /**
     * 检查操作数类型是否支持
     *
     * @param type 数据类型
     * @return 是否支持
     */
    boolean supportsType(Class<?> type);
}
