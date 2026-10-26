package cn.boommanpro.gaia.workflow.app.config;

import cn.hutool.json.JSONNull;
import com.fasterxml.jackson.core.JsonGenerator;
import com.fasterxml.jackson.databind.JsonSerializer;
import com.fasterxml.jackson.databind.SerializerProvider;
import com.fasterxml.jackson.databind.module.SimpleModule;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.boot.autoconfigure.jackson.Jackson2ObjectMapperBuilderCustomizer;

import java.io.IOException;

/**
 * hutool JSONNull 的 Jackson 兼容：hutool JSONObject 里显式置 null 的键值是 JSONNull 单例
 * （不是 Java null），默认 BeanSerializer 找不到任何属性 →
 * InvalidDefinitionException 500。2026-10-25 C04 实证：run_state timeline 里的
 * connect.fromPort=JSONNull 直接把 GET /status 打挂（前端轮询一并失败）。
 * 注册专属序列化器让 JSONNull 按 JSON null 输出。
 */
@Configuration
public class JacksonHutoolConfig {

    @Bean
    public Jackson2ObjectMapperBuilderCustomizer hutoolJsonNullSerializer() {
        return builder -> builder.postConfigurer(mapper -> {
            SimpleModule module = new SimpleModule("hutool-jsonnull");
            module.addSerializer(JSONNull.class, new JsonSerializer<JSONNull>() {
                @Override
                public void serialize(JSONNull value, JsonGenerator gen, SerializerProvider serializers) throws IOException {
                    gen.writeNull();
                }
            });
            mapper.registerModule(module);
        });
    }
}
