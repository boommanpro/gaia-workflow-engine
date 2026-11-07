package cn.boommanpro.gaia.workflow.app.agent.engine;

import cn.boommanpro.gaia.workflow.app.agent.core.AgentRegistry;
import cn.boommanpro.gaia.workflow.app.agent.core.ConversationStore;
import cn.boommanpro.gaia.workflow.app.agent.runtime.SystemPromptResolver;
import cn.boommanpro.gaia.workflow.app.agent.tool.ToolExecutorRegistry;
import cn.boommanpro.gaia.workflow.app.config.AgentProperties;
import cn.boommanpro.gaia.workflow.app.service.AgentModelConfigService;
import cn.boommanpro.gaia.workflow.app.service.AgentToolRegistry;
import cn.boommanpro.gaia.workflow.infra.manage.service.AgentLlmCallLogService;
import io.agentscope.core.model.ExecutionConfig;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.Duration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

/**
 * agent.llm.retry → 框架 ExecutionConfig 的透传（2026-11-04 会话 96ba4201 两轮
 * Retries exhausted 4/4 后，重试策略从硬编码改为可配，本测试锁住 wiring 与下限钳制）。
 */
@DisplayName("AgentScopeExecutionEngine：模型重试策略 agent.llm.retry 透传")
class AgentScopeEngineRetryConfigTest {

    private AgentScopeExecutionEngine engineWith(AgentProperties properties) {
        return new AgentScopeExecutionEngine(
            mock(AgentRegistry.class),
            mock(ToolExecutorRegistry.class),
            mock(AgentToolRegistry.class),
            mock(SystemPromptResolver.class),
            mock(ConversationStore.class),
            mock(AgentModelConfigService.class),
            mock(cn.boommanpro.gaia.workflow.infra.manage.service.AgentToolCallLogService.class),
            mock(AgentLlmCallLogService.class),
            properties);
    }

    @Test
    @DisplayName("默认值：8 次 / 1s 起步 / 45s 封顶 / 倍率 2.0 / 超时 5 分钟")
    void defaultsCoverRateLimitStorm() {
        ExecutionConfig config = engineWith(new AgentProperties()).buildRetryConfig();
        assertThat(config.getMaxAttempts()).isEqualTo(8);
        assertThat(config.getInitialBackoff()).isEqualTo(Duration.ofMillis(1000));
        assertThat(config.getMaxBackoff()).isEqualTo(Duration.ofMillis(45000));
        assertThat(config.getBackoffMultiplier()).isEqualTo(2.0);
        assertThat(config.getTimeout()).isEqualTo(Duration.ofMinutes(5));
    }

    @Test
    @DisplayName("自定义配置全量透传（yml agent.llm.retry.* 在线生效）")
    void customConfigPassesThrough() {
        AgentProperties properties = new AgentProperties();
        AgentProperties.Retry retry = properties.getLlm().getRetry();
        retry.setMaxAttempts(12);
        retry.setInitialBackoffMs(2500);
        retry.setMaxBackoffMs(120000);
        retry.setBackoffMultiplier(1.5);
        retry.setTimeoutMs(60000);

        ExecutionConfig config = engineWith(properties).buildRetryConfig();
        assertThat(config.getMaxAttempts()).isEqualTo(12);
        assertThat(config.getInitialBackoff()).isEqualTo(Duration.ofMillis(2500));
        assertThat(config.getMaxBackoff()).isEqualTo(Duration.ofMillis(120000));
        assertThat(config.getBackoffMultiplier()).isEqualTo(1.5);
        assertThat(config.getTimeout()).isEqualTo(Duration.ofSeconds(60));
    }

    @Test
    @DisplayName("非法下限钳制：attempts 0 → 1、倍率 0.5 → 1.0（reactor Retry.backoff 会抛 IllegalArgumentException）")
    void clampsInvalidLowerBounds() {
        AgentProperties properties = new AgentProperties();
        AgentProperties.Retry retry = properties.getLlm().getRetry();
        retry.setMaxAttempts(0);
        retry.setBackoffMultiplier(0.5);

        ExecutionConfig config = engineWith(properties).buildRetryConfig();
        assertThat(config.getMaxAttempts()).isEqualTo(1);
        assertThat(config.getBackoffMultiplier()).isEqualTo(1.0);
    }
}
