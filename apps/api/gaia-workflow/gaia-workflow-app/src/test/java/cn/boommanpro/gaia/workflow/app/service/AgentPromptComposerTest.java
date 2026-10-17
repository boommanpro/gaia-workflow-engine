package cn.boommanpro.gaia.workflow.app.service;

import cn.boommanpro.gaia.workflow.infra.manage.entity.AgentPromptConfig;
import cn.boommanpro.gaia.workflow.infra.manage.service.AgentPromptConfigService;
import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * 系统提示词组装器（期4）：段序固定（IDENTITY→SOUL→AGENTS）、DB 覆盖、classpath 兜底。
 */
class AgentPromptComposerTest {

    private AgentPromptConfigService infraServiceReturning(AgentPromptConfig config) {
        AgentPromptConfigService service = mock(AgentPromptConfigService.class);
        when(service.getOne(any(QueryWrapper.class))).thenReturn(config);
        return service;
    }

    @Test
    @DisplayName("无 DB 覆盖：classpath 四文件按 IDENTITY→SOUL→AGENTS 组装，段序固定")
    void composeFromClasspath() {
        AgentPromptComposer composer = new AgentPromptComposer(infraServiceReturning(null));
        String prompt = composer.composeSystemPrompt();
        int identity = prompt.indexOf("身份（IDENTITY）");
        int soul = prompt.indexOf("性格与语气（SOUL）");
        int agents = prompt.indexOf("工作规范（AGENTS）");
        assertTrue(identity >= 0 && soul > identity && agents > soul, "段序必须固定: " + identity + "," + soul + "," + agents);
        assertTrue(prompt.contains("get(target=canvas)"), "AGENTS 应教学 8 工具链");
        assertFalse(prompt.contains("get_canvas"), "AGENTS 不得残留已下线工具名（2026-10-17 回归钉子）");
        assertTrue(prompt.contains("data.api"), "http 规范形状必须写进规范");
    }

    @Test
    @DisplayName("DB 覆盖优先于 classpath")
    void dbOverridesClasspath() {
        AgentPromptConfig overridden = new AgentPromptConfig();
        overridden.setConfigKey("soul");
        overridden.setContent("# 性格与语气（SOUL）\n自定义性格内容");
        AgentPromptComposer composer = new AgentPromptComposer(infraServiceReturning(overridden));
        String prompt = composer.composeSystemPrompt();
        assertTrue(prompt.contains("自定义性格内容"));
        assertFalse(prompt.contains("结论先行"), "DB 覆盖后 classpath 默认不再出现");
    }

    @Test
    @DisplayName("压缩提示词：读配置并剥掉版本注释")
    void compactionPrompt() {
        AgentPromptConfig overridden = new AgentPromptConfig();
        overridden.setConfigKey("compaction");
        overridden.setContent("<!-- gaia:prompt-config:compaction -->\n自定义压缩指令");
        AgentPromptComposer composer = new AgentPromptComposer(infraServiceReturning(overridden));
        String prompt = composer.loadCompactionPrompt();
        assertEquals("自定义压缩指令", prompt);
    }

    @Test
    @DisplayName("describeAll 返回四个配置键")
    void describeAllHasFourKeys() {
        AgentPromptComposer composer = new AgentPromptComposer(infraServiceReturning(null));
        assertEquals(4, composer.describeAll().size());
        assertTrue(composer.describeAll().containsKey("compaction"));
    }

}
