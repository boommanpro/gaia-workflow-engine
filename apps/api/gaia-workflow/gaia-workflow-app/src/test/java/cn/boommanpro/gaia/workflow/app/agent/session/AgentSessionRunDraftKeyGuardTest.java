package cn.boommanpro.gaia.workflow.app.agent.session;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * startRun 拒收 draft- 伪会话键（第一档 F 项）。
 *
 * 根因链：前端草稿会话物化失败后原地重试会带着 draft- 伪键裸发；
 * ensureSession 会把伪键建成无归属孤儿会话并启动 run，而前端 SSE
 * 不订阅 draft- 键——回复永不渲染，表现为「发送静默失败」。
 * 守卫在触碰任何协作者之前返回，构造参数传 null 即可。
 */
class AgentSessionRunDraftKeyGuardTest {

    private AgentSessionRunService newService() {
        return new AgentSessionRunService(null, null, null, null, null, null, null, null);
    }

    @Test
    void draftKeyShouldBeRejectedAsConflict() {
        AgentSessionRunService.StartResult result =
            newService().startRun("draft-local-abc123", "重试这条", "{}", "zh", null, null);
        assertFalse(result.accepted);
        assertTrue(result.error != null && result.error.contains("draft"));
    }

    @Test
    void blankSessionKeyStillRejected() {
        AgentSessionRunService.StartResult result =
            newService().startRun("", "hi", "{}", "zh", null, null);
        assertFalse(result.accepted);
    }
}
