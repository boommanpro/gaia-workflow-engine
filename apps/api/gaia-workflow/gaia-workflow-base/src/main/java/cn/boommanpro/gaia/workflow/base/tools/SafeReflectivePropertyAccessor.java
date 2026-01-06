package cn.boommanpro.gaia.workflow.base.tools;

import org.springframework.expression.AccessException;
import org.springframework.expression.EvaluationContext;
import org.springframework.expression.PropertyAccessor;
import org.springframework.expression.TypedValue;
import org.springframework.expression.spel.support.ReflectivePropertyAccessor;

/**
 * 安全的反射属性访问器，处理链式属性访问中的 null 值
 */
public class SafeReflectivePropertyAccessor implements PropertyAccessor {

    private final ReflectivePropertyAccessor reflectivePropertyAccessor = new ReflectivePropertyAccessor();

    @Override
    public Class<?>[] getSpecificTargetClasses() {
        return null; // 不限制目标类型
    }

    @Override
    public boolean canRead(EvaluationContext context, Object target, String name) throws AccessException {
        if (target == null) {
            return true;
        }
        return reflectivePropertyAccessor.canRead(context, target, name);
    }

    @Override
    public TypedValue read(EvaluationContext context, Object target, String name) throws AccessException {
        if (target == null) {
            return TypedValue.NULL;
        }
        return reflectivePropertyAccessor.read(context, target, name);
    }

    @Override
    public boolean canWrite(EvaluationContext context, Object target, String name) throws AccessException {
        if (target == null) {
            return false;
        }
        return reflectivePropertyAccessor.canWrite(context, target, name);
    }

    @Override
    public void write(EvaluationContext context, Object target, String name, Object newValue) throws AccessException {
        if (target == null) {
            return; // 不写入到 null 对象
        }
        reflectivePropertyAccessor.write(context, target, name, newValue);
    }
}

