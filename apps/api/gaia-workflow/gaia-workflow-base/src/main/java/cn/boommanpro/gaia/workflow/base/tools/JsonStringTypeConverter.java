package cn.boommanpro.gaia.workflow.base.tools;

import cn.hutool.json.JSONUtil;
import org.springframework.core.convert.TypeDescriptor;
import org.springframework.expression.TypeConverter;
import org.springframework.expression.spel.support.StandardTypeConverter;

import java.util.Collection;
import java.util.Map;

/**
 * SpEL 类型转换器：目标是 String 而值是数组 / 集合 / Map 时，序列化为 JSON 文本，
 * 其余交给标准转换器。
 *
 * <p>模板 {@code {{ start_1.items }}} 把上游数组塞进提示词 / 请求体是最常见的写法，
 * 标准转换器对 List → String 只会抛 EL1001E（2026-10-24 会话 b6e34195 实证：llm / http
 * 节点整流反复失败，模型无从修复——这不是配置问题而是平台没给合理的默认表现）。</p>
 */
public class JsonStringTypeConverter implements TypeConverter {

    private final StandardTypeConverter delegate = new StandardTypeConverter();

    @Override
    public boolean canConvert(TypeDescriptor sourceType, TypeDescriptor targetType) {
        if (isStructuredToString(sourceType, targetType)) {
            return true;
        }
        return delegate.canConvert(sourceType, targetType);
    }

    @Override
    public Object convertValue(Object value, TypeDescriptor sourceType, TypeDescriptor targetType) {
        if (value != null && isStructuredToString(sourceType, targetType)) {
            return JSONUtil.toJsonStr(value);
        }
        return delegate.convertValue(value, sourceType, targetType);
    }

    private static boolean isStructuredToString(TypeDescriptor sourceType, TypeDescriptor targetType) {
        if (sourceType == null || targetType == null || targetType.getObjectType() != String.class) {
            return false;
        }
        Class<?> source = sourceType.getObjectType();
        return Collection.class.isAssignableFrom(source) || Map.class.isAssignableFrom(source) || source.isArray();
    }
}
