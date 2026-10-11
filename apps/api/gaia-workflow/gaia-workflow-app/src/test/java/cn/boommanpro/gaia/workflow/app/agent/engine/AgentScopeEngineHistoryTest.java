package cn.boommanpro.gaia.workflow.app.agent.engine;

import cn.boommanpro.gaia.workflow.app.agent.core.AgentDefinition;
import cn.boommanpro.gaia.workflow.app.agent.core.AgentRegistry;
import cn.boommanpro.gaia.workflow.app.agent.core.AgentRequest;
import cn.boommanpro.gaia.workflow.app.agent.core.AgentRunContext;
import cn.boommanpro.gaia.workflow.app.agent.core.ConversationStore;
import cn.boommanpro.gaia.workflow.app.agent.core.ToolExecutionMode;
import cn.boommanpro.gaia.workflow.app.agent.llm.LlmMessage;
import cn.boommanpro.gaia.workflow.app.agent.llm.LlmToolCall;
import cn.boommanpro.gaia.workflow.app.agent.tool.ToolExecutorRegistry;
import cn.boommanpro.gaia.workflow.app.config.AgentProperties;
import cn.boommanpro.gaia.workflow.app.service.AgentModelConfigService;
import cn.boommanpro.gaia.workflow.app.service.AgentToolRegistry;
import cn.boommanpro.gaia.workflow.infra.manage.service.AgentToolCallLogService;
import io.agentscope.core.message.MsgRole;
import io.agentscope.core.message.TextBlock;
import io.agentscope.core.message.ToolUseBlock;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * 历史回放守护测试：agent_message.tool_calls 回写后，下一轮 run 组装的
 * Msg 序列必须保留合法的 tool_use → tool_result 配对。
 *
 * <p>背景（2026-10-10 edit_workflow 31 连败总根子）：换核后 assistant 落库
 * 不带 toolCalls，回放只剩孤儿 tool 结果 —— 模型看不见自己上一轮怎么调的，
 * OpenAI 兼容端点还可能因协议不合法忽略全部失败回执，自修复能力归零。</p>
 */
@DisplayName("AgentScopeExecutionEngine：历史回放保留 tool_use/tool_result 配对")
class AgentScopeEngineHistoryTest {

    private AgentScopeExecutionEngine engine;
    private ConversationStore conversationStore;

    @BeforeEach
    void setUp() {
        conversationStore = mock(ConversationStore.class);
        engine = new AgentScopeExecutionEngine(
            mock(AgentRegistry.class),
            mock(ToolExecutorRegistry.class),
            mock(AgentToolRegistry.class),
            mock(cn.boommanpro.gaia.workflow.app.agent.runtime.SystemPromptResolver.class),
            conversationStore,
            mock(AgentModelConfigService.class),
            mock(AgentToolCallLogService.class),
            mock(cn.boommanpro.gaia.workflow.infra.manage.service.AgentLlmCallLogService.class),
            new AgentProperties());
    }

    private static LlmToolCall toolCall(String id, String name, String arguments) {
        return LlmToolCall.builder().id(id).name(name).arguments(arguments).build();
    }

    @Test
    @DisplayName("assistant.toolCalls + tool 行 → ToolUseBlock 与 ToolResultMessage 交错配对")
    void toolCallsSurviveReplay() {
        // 真实落库形态（引擎修复后）：assistant 带两个工具调用，随后是两条 tool 结果
        String toolCallsJson = "[{\"id\":\"call-1\",\"type\":\"function\",\"function\":"
            + "{\"name\":\"edit_workflow\",\"arguments\":\"{\\\"ops\\\":[]}\"}},"
            + "{\"id\":\"call-2\",\"type\":\"function\",\"function\":"
            + "{\"name\":\"save_workflow\",\"arguments\":\"{}\"}}]";
        List<LlmMessage> history = Arrays.asList(
            LlmMessage.builder().role("user").content("帮我修改工作流").build(),
            LlmMessage.builder().role("assistant").content("好的，先改再存。").toolCalls(
                Arrays.asList(toolCall("call-1", "edit_workflow", "{\"ops\":[]}"),
                    toolCall("call-2", "save_workflow", "{}"))).build(),
            LlmMessage.builder().role("tool").toolCallId("call-1")
                .content("{\"error\":{\"code\":\"INVALID_ARGS\"}}").build(),
            LlmMessage.builder().role("tool").toolCallId("call-2")
                .content("{\"success\":true}").build());

        when(conversationStore.loadHistory("s1", 0)).thenReturn(history);

        AgentRequest request = new AgentRequest("r1", "帮我修改工作流", "s1", "zh-CN", null,
            ToolExecutionMode.BACKEND, 0, null, null);
        AgentRunContext context = new AgentRunContext(request, new AgentDefinition(), ToolExecutionMode.BACKEND);
        List<io.agentscope.core.message.Msg> msgs = engine.buildMessages(context, "s1");

        // user → assistant(带 tool_use) → tool → tool
        assertEquals(4, msgs.size());
        assertEquals(MsgRole.USER, msgs.get(0).getRole());
        assertEquals(MsgRole.ASSISTANT, msgs.get(1).getRole());
        assertEquals(MsgRole.TOOL, msgs.get(2).getRole());
        assertEquals(MsgRole.TOOL, msgs.get(3).getRole());

        // assistant 消息里有文本 + 两个 ToolUseBlock
        List<ToolUseBlock> toolUses = new ArrayList<>();
        StringBuilder text = new StringBuilder();
        for (Object block : msgs.get(1).getContent()) {
            if (block instanceof ToolUseBlock) {
                toolUses.add((ToolUseBlock) block);
            } else if (block instanceof TextBlock) {
                text.append(((TextBlock) block).getText());
            }
        }
        assertEquals(2, toolUses.size(), "assistant 消息必须重建出 2 个 tool_use 块");
        assertEquals("edit_workflow", toolUses.get(0).getName());
        assertEquals("call-1", toolUses.get(0).getId());
        assertEquals("save_workflow", toolUses.get(1).getName());
        assertTrue(text.toString().contains("先改再存"));

        // tool 结果与调用 id 一一对应（协议合法性：无孤儿结果）。
        // 配对信息在 Msg 内容的 ToolResultBlock 上（Msg 自身 id 是框架随机生成的，与此无关）
        io.agentscope.core.message.ToolResultBlock r1 =
            (io.agentscope.core.message.ToolResultBlock) msgs.get(2).getContent().get(0);
        io.agentscope.core.message.ToolResultBlock r2 =
            (io.agentscope.core.message.ToolResultBlock) msgs.get(3).getContent().get(0);
        assertEquals("call-1", r1.getId());
        assertEquals("call-2", r2.getId());
        assertTrue(r1.getOutput().toString().contains("INVALID_ARGS"));
    }

    @Test
    @DisplayName("孤儿 tool 结果（旧数据/无前驱调用）仍然成对进请求，不静默丢弃")
    void orphanToolResultStillPresent() {
        List<LlmMessage> history = Arrays.asList(
            LlmMessage.builder().role("user").content("改工作流").build(),
            // 旧引擎落库的 assistant：没有 toolCalls
            LlmMessage.builder().role("assistant").content("我调了工具").build(),
            LlmMessage.builder().role("tool").toolCallId("call-old").content("{\"success\":true}").build());
        when(conversationStore.loadHistory("s2", 0)).thenReturn(history);

        AgentRequest request = new AgentRequest("r2", "改工作流", "s2", "zh-CN", null,
            ToolExecutionMode.BACKEND, 0, null, null);
        AgentRunContext context = new AgentRunContext(request, new AgentDefinition(), ToolExecutionMode.BACKEND);
        List<io.agentscope.core.message.Msg> msgs = engine.buildMessages(context, "s2");

        // assistant 只有文本块也必须保留（不能因为无 blocks 被丢弃）
        assertEquals(3, msgs.size());
        assertEquals(MsgRole.ASSISTANT, msgs.get(1).getRole());
        assertEquals(MsgRole.TOOL, msgs.get(2).getRole());
    }
}
