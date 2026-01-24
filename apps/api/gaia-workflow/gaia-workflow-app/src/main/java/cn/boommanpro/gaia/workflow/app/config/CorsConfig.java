package cn.boommanpro.gaia.workflow.app.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * CORS配置类 - 启用完全跨域访问
 *
 * @author <a href="mailto:boommanpro@gmail.com">boommanpro</a>
 */
@Configuration
public class CorsConfig implements WebMvcConfigurer {

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        // 允许所有路径跨域访问
        registry.addMapping("/**")
                // 允许所有源跨域访问
                .allowedOriginPatterns("*")
                // 允许所有HTTP方法
                .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS", "HEAD", "PATCH", "TRACE")
                // 允许所有请求头
                .allowedHeaders("*")
                // 允许携带认证信息（如cookies、authorization headers等）
                .allowCredentials(true)
                // 预检请求缓存时间（秒）
                .maxAge(3600);
    }
}