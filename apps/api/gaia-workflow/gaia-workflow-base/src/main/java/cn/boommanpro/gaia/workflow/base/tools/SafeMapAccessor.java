package cn.boommanpro.gaia.workflow.base.tools;

import org.springframework.expression.AccessException;
import org.springframework.expression.EvaluationContext;
import org.springframework.expression.PropertyAccessor;
import org.springframework.expression.TypedValue;
import org.springframework.expression.spel.support.ReflectivePropertyAccessor;

import java.util.Map;

/**
 * 安全的 Map 访问器，当访问不存在的属性时返回 null 而不是抛出异常
 */
public class SafeMapAccessor implements PropertyAccessor {

    private final ReflectivePropertyAccessor reflectivePropertyAccessor = new ReflectivePropertyAccessor();

    @Override
    public Class<?>[] getSpecificTargetClasses() {
        return new Class<?>[]{Map.class};
    }

    @Override
    public boolean canRead(EvaluationContext context, Object target, String name) throws AccessException {
        // 对于 null 目标也允许读取，返回 false 让 Spring EL 继续处理
        if (target == null) {
            return false;
        }
        if (target instanceof Map) {
            return true;
        }
        return reflectivePropertyAccessor.canRead(context, target, name);
    }

    @Override
    public TypedValue read(EvaluationContext context, Object target, String name) throws AccessException {
        // 如果 target 是 null，直接返回 TypedValue.NULL
        if (target == null) {
            return TypedValue.NULL;
        }

        if (target instanceof Map) {
            Map<?, ?> map = (Map<?, ?>) target;
            if (map.containsKey(name)) {
                Object value = map.get(name);
                return new TypedValue(value);
            } else {
                // 当 Map 中不存在指定键时，返回 null 而不是抛出异常
                return TypedValue.NULL;
            }
        }
        return reflectivePropertyAccessor.read(context, target, name);
    }

    @Override
    public boolean canWrite(EvaluationContext context, Object target, String name) throws AccessException {
        if (target instanceof Map) {
            return true;
        }
        return reflectivePropertyAccessor.canWrite(context, target, name);
    }

    @Override
    public void write(EvaluationContext context, Object target, String name, Object newValue) throws AccessException {
        if (target instanceof Map) {
            Map<Object, Object> map = (Map<Object, Object>) target;
            map.put(name, newValue);
        } else {
            reflectivePropertyAccessor.write(context, target, name, newValue);
        }
    }
}

