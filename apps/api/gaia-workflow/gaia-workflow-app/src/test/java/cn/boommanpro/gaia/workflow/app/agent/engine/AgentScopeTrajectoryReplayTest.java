package cn.boommanpro.gaia.workflow.app.agent.engine;

import cn.boommanpro.gaia.workflow.app.agent.core.Agent;
import cn.boommanpro.gaia.workflow.app.agent.core.AgentDefinition;
import cn.boommanpro.gaia.workflow.app.agent.core.AgentRegistry;
import cn.boommanpro.gaia.workflow.app.agent.core.AgentRequest;
import cn.boommanpro.gaia.workflow.app.agent.core.AgentRunResult;
import cn.boommanpro.gaia.workflow.app.agent.core.ConversationStore;
import cn.boommanpro.gaia.workflow.app.agent.event.AgentEvent;
import cn.boommanpro.gaia.workflow.app.agent.event.AgentEventSink;
import cn.boommanpro.gaia.workflow.app.agent.llm.LlmMessage;
import cn.boommanpro.gaia.workflow.app.agent.tool.ToolExecutor;
import cn.boommanpro.gaia.workflow.app.agent.tool.ToolExecutorRegistry;
import cn.boommanpro.gaia.workflow.app.agent.tool.ToolResult;
import cn.boommanpro.gaia.workflow.app.config.AgentProperties;
import cn.boommanpro.gaia.workflow.app.service.AgentModelConfigService;
import cn.boommanpro.gaia.workflow.app.service.AgentToolRegistry;
import cn.boommanpro.gaia.workflow.infra.manage.entity.AgentToolDefinition;
import cn.boommanpro.gaia.workflow.infra.manage.service.AgentLlmCallLogService;
import cn.boommanpro.gaia.workflow.infra.manage.service.AgentToolCallLogService;
import cn.hutool.json.JSONObject;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * 轨迹回放守护测试（dsh trajectory-replay 同款）：ScriptedChatModel 按录制脚本
 * 逐次回放「工具调用 → 正文」，验证引擎全链路 —— ReAct 循环、工具执行管道、
 * 事件协议、消息持久化 —— 零真实 LLM 依赖。
 *
 * <p>蓝本来自被换核删除的 AgentTrajectoryReplayTest（HEAD 9367f875），
 * 按 AgentScope 引擎重写。</p>
 */
@DisplayName("ScriptedChatModel 轨迹回放：引擎全链路零 LLM 验收")
class AgentScopeTrajectoryReplayTest {

    private ConversationStore conversationStore;
    private AgentScopeExecutionEngine engine;
    private final List<AgentEvent> events = Collections.synchronizedList(new ArrayList<>());
    private final AgentEventSink sink = events::add;

    @BeforeEach
    void setUp() {
        conversationStore = mock(ConversationStore.class);

        // 脚本化模型：两条响应 —— ① 思考 + echo_tool 调用；② 正文收尾
        AgentProperties properties = new AgentProperties();
        properties.getLlm().setScripted(true);
        properties.getLlm().setScriptedResource("classpath:agent/scripted-trajectory-iteration.json");

        AgentDefinition definition = new AgentDefinition();
        definition.setId("scripted-agent");
        definition.setDescription("回放测试 Agent");
        definition.setEngine("agentscope");
        definition.setToolNames(Collections.emptySet()); // 空 = 全量工具

        Agent agent = mock(Agent.class);
        when(agent.getDefinition()).thenReturn(definition);

        AgentRegistry agentRegistry = mock(AgentRegistry.class);
        when(agentRegistry.route(any())).thenReturn(Optional.of(agent));

        ToolExecutor echoExecutor = new ToolExecutor() {
            @Override
            public String name() {
                return "echo_tool";
            }

            @Override
            public ToolResult execute(JSONObject args, cn.boommanpro.gaia.workflow.app.agent.core.AgentRunContext context) {
                return ToolResult.ok("{\"echo\":\"" + args.getStr("input", "") + "\"}");
            }
        };
        ToolExecutorRegistry executorRegistry = mock(ToolExecutorRegistry.class);
        when(executorRegistry.get("echo_tool")).thenReturn(Optional.of(echoExecutor));

        AgentToolDefinition toolDef = new AgentToolDefinition();
        toolDef.setToolName("echo_tool");
        toolDef.setDescription("回声工具");
        toolDef.setEnabled(1);
        // schema 不设 required：agentscope 内置校验与流式 args 装配的交互细节
        // 不在轨迹回放的验收面内（那是 ToolArgsValidatorTest 的职责）
        toolDef.setParameters("{\"type\":\"object\",\"properties\":{\"input\":{\"type\":\"string\"}}}");
        AgentToolRegistry schemaRegistry = mock(AgentToolRegistry.class);
        when(schemaRegistry.getToolDefinitions()).thenReturn(List.of(toolDef));
        when(schemaRegistry.getToolParameters("echo_tool")).thenReturn(
            cn.hutool.json.JSONUtil.parseObj(toolDef.getParameters()));

        cn.boommanpro.gaia.workflow.app.agent.runtime.SystemPromptResolver promptResolver =
            mock(cn.boommanpro.gaia.workflow.app.agent.runtime.SystemPromptResolver.class);
        when(promptResolver.resolve(eq(definition), anyString())).thenReturn("system prompt");

        AgentModelConfigService modelConfigService = mock(AgentModelConfigService.class);
        when(modelConfigService.getLlmConfig()).thenReturn(mock(AgentModelConfigService.LlmConfig.class));

        engine = new AgentScopeExecutionEngine(agentRegistry, executorRegistry, schemaRegistry,
            promptResolver, conversationStore, modelConfigService,
            mock(AgentToolCallLogService.class), mock(AgentLlmCallLogService.class), properties);
    }

    private AgentRequest request() {
        // AgentRequest 为全参构造：sessionKey, message, locale, pageContext, agentId,
        // executionMode, maxTurns, variables, runId
        return new AgentRequest("s-traj-replay", "跑一遍工具链路",
            null, null, null, null, 0, null, null);
    }

    @Test
    @DisplayName("脚本回放：工具调用被执行、事件协议完整、终稿按 toolCalls 回写落库")
    void scriptedTrajectoryRunsEndToEnd() {
        when(conversationStore.loadHistory(eq("s-traj-replay"), anyInt()))
            .thenReturn(List.of(LlmMessage.builder().role("user").content("跑一遍工具链路").build()));

        AgentRunResult result = engine.run(request(), sink);

        assertTrue(!result.isError(), "run 应成功：" + result);
        assertEquals("agentscope", result.getEngine());

        // 事件协议：turn → tool_call → tool_result → token → assistant_settled
        List<String> types = events.stream().map(AgentEvent::getType).toList();
        assertTrue(types.contains("turn"), "缺 turn: " + types);
        assertTrue(types.contains("tool_call"), "缺 tool_call: " + types);
        assertTrue(types.contains("tool_result"), "缺 tool_result: " + types);
        assertTrue(types.contains("token"), "缺 token: " + types);
        assertTrue(types.contains("assistant_settled"), "缺 assistant_settled: " + types);

        // 工具真被引擎执行了（echo 的输入进了结果 payload）
        boolean echoed = events.stream()
            .filter(e -> "tool_result".equals(e.getType()))
            .anyMatch(e -> e.getData().toString().contains("hello"));
        assertTrue(echoed, "echo_tool 结果应含输入回声");

        // 终稿带 toolCalls 回写落库（下一轮历史回放才有合法 tool_use/tool_result 配对），
        // 脚本里的思考过程一并持久化
        verify(conversationStore).saveMessage(eq("s-traj-replay"), eq("assistant"),
            contains("轨迹回放完成"), anyString(), eq((String) null), contains("echo_tool"));
    }
}
