package cn.boommanpro.gaia.workflow.app.config;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * 注册 API Key 鉴权拦截器：对外数据面 /api/v1/wf/**（工作流级 key）
 * 与对外控制面 /mcp/gaia/**（实例级 key，未配置则放行）。
 */
@Configuration
public class ApiKeyWebConfig implements WebMvcConfigurer {

    @Autowired
    private ApiKeyAuthInterceptor apiKeyAuthInterceptor;

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(apiKeyAuthInterceptor)
                .addPathPatterns("/api/v1/wf/**", "/mcp/gaia/**");
    }
}
