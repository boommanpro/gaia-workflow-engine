package cn.boommanpro.gaia.workflow.app.agent.engine;

import cn.boommanpro.gaia.workflow.app.agent.core.ConversationStore;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

/**
 * 中断落库契约：已流出的部分正文必须随中断 marker 一起持久化 ——
 * 否则刷新后用户看到过的正文从 DB 视图消失且无事件再触发重载
 * （2026-10-11 前端「页面刷新一致性异常」的后端根因之一）。
 */
@DisplayName("AgentScopeExecutionEngine：中断时部分正文随 marker 落库")
class AgentScopeInterruptedPersistTest {

    @Test
    @DisplayName("有部分正文：正文 + marker 一起落库，thinking 保留")
    void partialContentIsPersisted() {
        ConversationStore store = mock(ConversationStore.class);

        String persisted = AgentScopeExecutionEngine.persistInterruptedRun(
            store, "s1", "好的，方案框架如下：\n\n1. 目标人群", "思考过程", "[{\"id\":\"c1\"}]");

        ArgumentCaptor<String> content = ArgumentCaptor.forClass(String.class);
        verify(store).saveMessage(org.mockito.ArgumentMatchers.eq("s1"),
            org.mockito.ArgumentMatchers.eq("assistant"),
            content.capture(),
            org.mockito.ArgumentMatchers.eq("[{\"id\":\"c1\"}]"),
            org.mockito.ArgumentMatchers.isNull(),
            org.mockito.ArgumentMatchers.eq("思考过程"));
        assertEquals("好的，方案框架如下：\n\n1. 目标人群\n\n⏹ 本次运行已被中断。已完成的部分（草稿/已落版版本）保持有效。",
            content.getValue());
        assertTrue(persisted.startsWith("好的，方案框架如下"));
        assertTrue(persisted.contains("已被中断"));
    }

    @Test
    @DisplayName("无部分正文：仅 marker 落库（5 参签名，无 thinking）")
    void emptyPartialFallsBackToMarkerOnly() {
        ConversationStore store = mock(ConversationStore.class);

        String persisted = AgentScopeExecutionEngine.persistInterruptedRun(
            store, "s1", "", null, null);

        verify(store).saveMessage(org.mockito.ArgumentMatchers.eq("s1"),
            org.mockito.ArgumentMatchers.eq("assistant"),
            org.mockito.ArgumentMatchers.eq("⏹ 本次运行已被中断。已完成的部分（草稿/已落版版本）保持有效。"),
            org.mockito.ArgumentMatchers.isNull(),
            org.mockito.ArgumentMatchers.isNull());
        assertEquals("⏹ 本次运行已被中断。已完成的部分（草稿/已落版版本）保持有效。", persisted);
    }

    @Test
    @DisplayName("null 正文等价空正文")
    void nullPartialTreatedAsEmpty() {
        ConversationStore store = mock(ConversationStore.class);

        AgentScopeExecutionEngine.persistInterruptedRun(store, "s1", null, null, null);

        verify(store).saveMessage(org.mockito.ArgumentMatchers.eq("s1"),
            org.mockito.ArgumentMatchers.eq("assistant"),
            org.mockito.ArgumentMatchers.contains("已被中断"),
            org.mockito.ArgumentMatchers.isNull(),
            org.mockito.ArgumentMatchers.isNull());
    }
}
