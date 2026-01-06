package cn.boommanpro.gaia.workflow.infra.extend.node.condition;

import cn.hutool.core.util.StrUtil;
import java.util.Collection;

/**
 * 包含操作符实现
 */
public class ContainsOperator implements ConditionOperator<Object> {

    @Override
    public boolean apply(Object left, Object right) {
        if (left == null || right == null) {
            return false;
        }

        // 处理数组/集合包含情况
        if (left instanceof Collection) {
            return ((Collection<?>) left).contains(right);
        }

        // 处理数组包含情况
        if (left.getClass().isArray()) {
            int length = java.lang.reflect.Array.getLength(left);
            for (int i = 0; i < length; i++) {
                Object item = java.lang.reflect.Array.get(left, i);
                if (item != null && item.equals(right)) {
                    return true;
                }
            }
            return false;
        }

        // 处理字符串包含情况
        if (left instanceof String && right instanceof String) {
            return StrUtil.contains((String) left, (String) right);
        }

        // 其他情况返回false
        return false;
    }

    @Override
    public String getOperator() {
        return "contains";
    }

    @Override
    public boolean supportsType(Class<?> type) {
        return true;
    }
}
