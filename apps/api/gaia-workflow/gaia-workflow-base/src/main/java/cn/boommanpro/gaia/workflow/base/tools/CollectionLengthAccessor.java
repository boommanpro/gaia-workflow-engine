package cn.boommanpro.gaia.workflow.base.tools;

import org.springframework.expression.AccessException;
import org.springframework.expression.EvaluationContext;
import org.springframework.expression.PropertyAccessor;
import org.springframework.expression.TypedValue;

import java.lang.reflect.Array;
import java.util.Collection;

/**
 * 集合 / 数组 / 字符串的 {@code length} / {@code size} 只读属性访问器。
 *
 * <p>模型写模板与条件表达式时按 JS 习惯写 {@code items.length}，而 SpEL 对
 * List / hutool JSONArray 只认 {@code size()} 方法、对 String 只认 {@code length()}
 * 方法——属性形式一律 EL1008E（2026-10-24 会话 b6e34195 实证：高风险分支整条链路
 * 因一处 {@code .length} 报 Chain execute error，测试用例无法通过）。这里把
 * {@code length} / {@code size} 统一解析为元素个数 / 字符数。</p>
 *
 * <p>通用访问器（不限定目标类型），需注册在反射访问器之前；Map 由 SafeMapAccessor
 * 作为特定类型访问器优先处理，不受影响（Map 的 length 键仍按键取值）。</p>
 */
public class CollectionLengthAccessor implements PropertyAccessor {

    @Override
    public Class<?>[] getSpecificTargetClasses() {
        return null;
    }

    @Override
    public boolean canRead(EvaluationContext context, Object target, String name) throws AccessException {
        if (target == null || !("length".equals(name) || "size".equals(name))) {
            return false;
        }
        return target instanceof Collection || target instanceof CharSequence || target.getClass().isArray();
    }

    @Override
    public TypedValue read(EvaluationContext context, Object target, String name) throws AccessException {
        if (target instanceof Collection) {
            return new TypedValue(((Collection<?>) target).size());
        }
        if (target instanceof CharSequence) {
            return new TypedValue(((CharSequence) target).length());
        }
        if (target != null && target.getClass().isArray()) {
            return new TypedValue(Array.getLength(target));
        }
        return TypedValue.NULL;
    }

    @Override
    public boolean canWrite(EvaluationContext context, Object target, String name) throws AccessException {
        return false;
    }

    @Override
    public void write(EvaluationContext context, Object target, String name, Object newValue) throws AccessException {
        throw new AccessException("length/size 为只读属性");
    }
}
