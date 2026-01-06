package cn.boommanpro.gaia.workflow.infra.extend.node.condition;

import cn.hutool.core.collection.CollUtil;
import cn.hutool.core.util.StrUtil;

import java.util.Map;

/**
 * 为空操作符实现
 */
public class IsEmptyOperator implements ConditionOperator<Object> {

    @Override
    public boolean apply(Object left, Object right) {
        // 只检查左操作数是否为空
        if (left == null) {
            return true;
        }

        if (left instanceof String) {
            return StrUtil.isEmpty((String) left);
        }

        if (left instanceof Map) {
            return ((Map<?, ?>) left).isEmpty();
        }

        if (left instanceof Iterable) {
            return CollUtil.isEmpty((Iterable<?>) left);
        }

        // 对于数组类型
        if (left.getClass().isArray()) {
            return java.lang.reflect.Array.getLength(left) == 0;
        }

        // 其他类型默认不为空
        return false;
    }

    @Override
    public String getOperator() {
        return "is_empty";
    }

    @Override
    public boolean supportsType(Class<?> type) {
        return true; // 支持所有类型
    }
}
