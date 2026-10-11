package cn.boommanpro.gaia.workflow.app.agent.runtime;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * 失控防护计数器单测（语义承接旧自研引擎的 wrap-up 轮）。
 */
class WrapUpGuardTest {

    @Test
    void triggersOnTurnCeiling() {
        WrapUpGuard guard = new WrapUpGuard(3, 8);
        guard.onModelTurn();
        guard.onModelTurn();
        assertFalse(guard.isWrappedUp());
        guard.onModelTurn();
        assertTrue(guard.isWrappedUp());
        assertTrue(guard.advisory().contains("3 轮"));
    }

    @Test
    void triggersOnNoProgressStreak() {
        WrapUpGuard guard = new WrapUpGuard(100, 2);
        // 轮 1：工具全失败
        guard.onModelTurn();
        guard.onToolCall();
        guard.onToolResult(false);
        // 轮 2 结算：连续无进展 1 → 轮内再全失败
        guard.onModelTurn();
        assertFalse(guard.isWrappedUp());
        guard.onToolCall();
        guard.onToolResult(false);
        // 轮 3 结算：连续无进展 2 → 触发
        guard.onModelTurn();
        assertTrue(guard.isWrappedUp());
    }

    @Test
    void successResetsNoProgressStreak() {
        WrapUpGuard guard = new WrapUpGuard(100, 2);
        for (int i = 0; i < 5; i++) {
            guard.onModelTurn();
            guard.onToolCall();
            guard.onToolResult(i % 2 == 0); // 交替成功/失败
            assertFalse(guard.isWrappedUp(), "任一成功即归零，永不触发");
        }
    }

    @Test
    void emptyTurnsDoNotCountAsNoProgress() {
        WrapUpGuard guard = new WrapUpGuard(100, 2);
        guard.onModelTurn();
        guard.onModelTurn();
        guard.onModelTurn();
        assertFalse(guard.isWrappedUp(), "没有工具调用的轮（纯文本）不算无进展");
    }
}
