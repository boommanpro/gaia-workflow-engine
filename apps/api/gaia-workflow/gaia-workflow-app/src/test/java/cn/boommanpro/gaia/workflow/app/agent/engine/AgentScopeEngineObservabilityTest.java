package cn.boommanpro.gaia.workflow.app.agent.engine;

import cn.boommanpro.gaia.workflow.app.agent.core.AgentDefinition;
import cn.boommanpro.gaia.workflow.app.agent.core.AgentRequest;
import cn.boommanpro.gaia.workflow.app.agent.core.AgentRunContext;
import cn.boommanpro.gaia.workflow.app.agent.core.ConversationStore;
import cn.boommanpro.gaia.workflow.app.agent.core.ToolExecutionMode;
import cn.boommanpro.gaia.workflow.app.agent.event.AgentEvent;
import cn.boommanpro.gaia.workflow.app.agent.event.AgentEventSink;
import cn.boommanpro.gaia.workflow.app.agent.llm.LlmMessage;
import cn.boommanpro.gaia.workflow.app.config.AgentProperties;
import cn.boommanpro.gaia.workflow.app.service.AgentModelConfigService;
import cn.boommanpro.gaia.workflow.app.service.AgentToolRegistry;
import cn.boommanpro.gaia.workflow.infra.manage.service.AgentLlmCallLogService;
import cn.boommanpro.gaia.workflow.infra.manage.service.AgentToolCallLogService;
import cn.hutool.json.JSONObject;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * 观测外显守护测试：压缩剪枝必须发事件（不能只进 log 文件）、
 * RecordingModel 的摘要构建（LLM 账本的数据质量）。
 */
@DisplayName("AgentScope 引擎观测外显")
class AgentScopeEngineObservabilityTest {

    private AgentScopeExecutionEngine engine;
    private ConversationStore conversationStore;
    private static final List<AgentEvent> events = new ArrayList<>();

    private static final AgentEventSink COLLECTING_SINK = new AgentEventSink() {
        @Override
        public void emit(AgentEvent event) {
            events.add(event);
        }

        @Override
        public boolean isActive() {
            return true;
        }
    };

    @BeforeEach
    void setUp() {
        events.clear();
        conversationStore = mock(ConversationStore.class);
        engine = new AgentScopeExecutionEngine(
            mock(cn.boommanpro.gaia.workflow.app.agent.core.AgentRegistry.class),
            mock(cn.boommanpro.gaia.workflow.app.agent.tool.ToolExecutorRegistry.class),
            mock(AgentToolRegistry.class),
            mock(cn.boommanpro.gaia.workflow.app.agent.runtime.SystemPromptResolver.class),
            conversationStore,
            mock(AgentModelConfigService.class),
            mock(AgentToolCallLogService.class),
            mock(AgentLlmCallLogService.class),
            new AgentProperties());
    }

    private AgentRunContext contextOf(String sessionKey) {
        AgentRequest request = new AgentRequest("r-" + sessionKey, "继续", "zh-CN", null, null,
            ToolExecutionMode.BACKEND, 0, null, null);
        return new AgentRunContext(request, new AgentDefinition(), ToolExecutionMode.BACKEND);
    }

    private static LlmMessage msg(String role, String content) {
        return LlmMessage.builder().role(role).content(content).build();
    }

    @Test
    @DisplayName("历史超过阈值 → 发 compaction(prune) 事件，带前后条数")
    void pruneEmitsCompactionEvent() {
        List<LlmMessage> history = new ArrayList<>();
        history.add(msg("user", "第一条"));
        for (int i = 0; i < 45; i++) {
            history.add(msg("assistant", "回复 " + i));
            history.add(msg("user", "追问 " + i));
        }
        when(conversationStore.loadHistory("s-prune", 0)).thenReturn(history);

        AgentRunContext ctx = contextOf("s-prune");
        List<io.agentscope.core.message.Msg> msgs = engine.buildMessages(ctx, "s-prune", COLLECTING_SINK, null);

        // 剪枝后只保留最近窗口
        assertEquals(30, msgs.size(), "45×2+1 条历史应剪到 HISTORY_KEEP=30");
        long compactionEvents = events.stream()
            .filter(e -> "compaction".equals(e.getType()))
            .filter(e -> "prune".equals(e.getData().getStr("kind")))
            .count();
        assertEquals(1, compactionEvents, "剪枝必须外发一条 compaction 事件");
        AgentEvent event = events.stream().filter(e -> "compaction".equals(e.getType())).findFirst().orElseThrow();
        assertEquals(91, event.getData().getInt("before"));
        assertEquals(30, event.getData().getInt("after"));
        assertEquals(61, event.getData().getInt("dropped"));
    }

    @Test
    @DisplayName("历史未超阈值 → 不发 compaction 事件")
    void noPruneEventBelowThreshold() {
        List<LlmMessage> history = List.of(msg("user", "你好"), msg("assistant", "你好！"));
        when(conversationStore.loadHistory("s-small", 0)).thenReturn(history);

        AgentRunContext ctx = contextOf("s-small");
        engine.buildMessages(ctx, "s-small", COLLECTING_SINK, null);

        assertFalse(events.stream().anyMatch(e -> "compaction".equals(e.getType())),
            "未触发剪枝时不应有 compaction 事件");
    }

    // ---------------- RecordingModel 摘要构建 ----------------

    @Test
    @DisplayName("truncate：超长头尾保留 + 中间挖洞标注原长")
    void truncateKeepsHeadAndTail() {
        String raw = "a".repeat(1500) + "MIDDLE" + "b".repeat(1500);
        String out = RecordingModel.truncate(raw, 400);
        assertTrue(out.contains("已截断，原文共 3006 字"));
        assertTrue(out.startsWith("a"), "头部必须保留");
        assertTrue(out.endsWith("b"), "尾部必须保留");
        assertFalse(out.contains("MIDDLE"), "中段应被挖掉");
        assertEquals("abc", RecordingModel.truncate("abc", 400));
        assertEquals("", RecordingModel.truncate(null, 400));
    }

    @Test
    @DisplayName("promptDigest：逐条 role 前缀 + 单条截断")
    void promptDigestFormatsRoles() {
        List<io.agentscope.core.message.Msg> msgs = List.of(
            io.agentscope.core.message.Msg.builder()
                .role(io.agentscope.core.message.MsgRole.USER)
                .textContent("帮我建工作流").build(),
            io.agentscope.core.message.Msg.builder()
                .role(io.agentscope.core.message.MsgRole.ASSISTANT)
                .textContent("好的。").build());
        String digest = RecordingModel.promptDigest(msgs);
        assertTrue(digest.contains("user: 帮我建工作流"));
        assertTrue(digest.contains("assistant: 好的。"));
        assertEquals("", RecordingModel.promptDigest(null));
        assertEquals("", RecordingModel.promptDigest(List.of()));
    }
}
