package cn.boommanpro.gaia.workflow.app.config;

import cn.boommanpro.gaia.workflow.infra.manage.service.GaiaWorkflowApiService;
import cn.boommanpro.gaia.workflow.infra.manage.service.GaiaWorkflowLogService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import java.lang.reflect.Field;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;

/**
 * 实例级 key（/mcp/gaia/**）两态回归：未配置放行（本地单机信任模式）、
 * 配置后无 key / 错 key 401、正确 key 放行；OPTIONS 预检恒放行。
 */
class ApiKeyAuthInterceptorMcpTest {

    private ApiKeyAuthInterceptor interceptor;
    private AgentProperties properties;

    @BeforeEach
    void setUp() throws Exception {
        interceptor = new ApiKeyAuthInterceptor();
        properties = new AgentProperties();
        inject("apiService", mock(GaiaWorkflowApiService.class));
        inject("logService", mock(GaiaWorkflowLogService.class));
        inject("agentProperties", properties);
    }

    private void inject(String field, Object value) throws Exception {
        Field f = ApiKeyAuthInterceptor.class.getDeclaredField(field);
        f.setAccessible(true);
        f.set(interceptor, value);
    }

    private MockHttpServletRequest mcpPost() {
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/mcp/gaia/ext-deepseek-01");
        return request;
    }

    @Test
    @DisplayName("未配置实例 key：/mcp/gaia/** 放行（本地单机信任模式）")
    void noKeysConfiguredAllowsAll() throws Exception {
        properties.getSecurity().setApiKeys("");
        assertTrue(interceptor.preHandle(mcpPost(), new MockHttpServletResponse(), null));
    }

    @Test
    @DisplayName("配置后：正确 X-API-Key 放行")
    void validKeyPasses() throws Exception {
        properties.getSecurity().setApiKeys("gaia-key-1, gaia-key-2");
        MockHttpServletRequest request = mcpPost();
        request.addHeader("X-API-Key", "gaia-key-2");
        assertTrue(interceptor.preHandle(request, new MockHttpServletResponse(), null));
    }

    @Test
    @DisplayName("配置后：缺 key 401")
    void missingKeyRejected() throws Exception {
        properties.getSecurity().setApiKeys("gaia-key-1");
        MockHttpServletResponse response = new MockHttpServletResponse();
        assertTrue(!interceptor.preHandle(mcpPost(), response, null));
        assertEquals(401, response.getStatus());
    }

    @Test
    @DisplayName("配置后：错误 key 401")
    void wrongKeyRejected() throws Exception {
        properties.getSecurity().setApiKeys("gaia-key-1");
        MockHttpServletRequest request = mcpPost();
        request.addHeader("X-API-Key", "not-a-key");
        MockHttpServletResponse response = new MockHttpServletResponse();
        assertTrue(!interceptor.preHandle(request, response, null));
        assertEquals(401, response.getStatus());
    }

    @Test
    @DisplayName("OPTIONS 预检恒放行（CORS 不带自定义头）")
    void optionsPreflightAlwaysPasses() throws Exception {
        properties.getSecurity().setApiKeys("gaia-key-1");
        MockHttpServletRequest request = new MockHttpServletRequest("OPTIONS", "/mcp/gaia/ext-1");
        assertTrue(interceptor.preHandle(request, new MockHttpServletResponse(), null));
    }

    @Test
    @DisplayName("非覆盖路径不受实例 key 影响（仍放行，交给后续逻辑）")
    void nonMcpPathUntouched() throws Exception {
        properties.getSecurity().setApiKeys("gaia-key-1");
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/workflow/list");
        assertTrue(interceptor.preHandle(request, new MockHttpServletResponse(), null));
    }
}
