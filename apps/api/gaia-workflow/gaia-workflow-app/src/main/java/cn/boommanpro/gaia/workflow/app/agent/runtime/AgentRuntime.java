package cn.boommanpro.gaia.workflow.app.agent.runtime;

import cn.boommanpro.gaia.workflow.app.agent.core.Agent;
import cn.boommanpro.gaia.workflow.app.agent.core.AgentDefinition;
import cn.boommanpro.gaia.workflow.app.agent.core.AgentRegistry;
import cn.boommanpro.gaia.workflow.app.agent.core.AgentRequest;
import cn.boommanpro.gaia.workflow.app.agent.core.AgentRunContext;
import cn.boommanpro.gaia.workflow.app.agent.core.AgentRunResult;
import cn.boommanpro.gaia.workflow.app.agent.core.AgentRunResult.PendingToolCall;
import cn.boommanpro.gaia.workflow.app.agent.core.ConversationStore;
import cn.boommanpro.gaia.workflow.app.agent.core.ToolExecutionMode;
import cn.boommanpro.gaia.workflow.app.agent.event.AgentEvent;
import cn.boommanpro.gaia.workflow.app.agent.event.AgentEventSink;
import cn.boommanpro.gaia.workflow.app.agent.llm.LlmChatRequest;
import cn.boommanpro.gaia.workflow.app.agent.llm.LlmChatResponse;
import cn.boommanpro.gaia.workflow.app.agent.llm.LlmMessage;
import cn.boommanpro.gaia.workflow.app.agent.llm.LlmProvider;
import cn.boommanpro.gaia.workflow.app.agent.llm.LlmProviderRegistry;
import cn.boommanpro.gaia.workflow.app.agent.llm.LlmToolCall;
import cn.boommanpro.gaia.workflow.app.agent.context.ContextProviderRegistry;
import cn.boommanpro.gaia.workflow.app.agent.tool.ToolExecutor;
import cn.boommanpro.gaia.workflow.app.agent.tool.ToolExecutorRegistry;
import cn.boommanpro.gaia.workflow.app.agent.tool.ToolResult;
import cn.boommanpro.gaia.workflow.app.service.AgentToolRegistry;
import cn.hutool.json.JSONArray;
import cn.hutool.json.JSONObject;
import cn.hutool.json.JSONUtil;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

/**
 * Agent 运行时引擎 —— 系统的执行心脏。
 *
 * <p>取代原先「后端转发 tool_call、前端执行、再回灌」的半截循环，
 * 这里实现完整的自治闭环：</p>
 *
 * <pre>
 *   选 Agent → 装上下文 → 调模型 → 有工具调用？
 *                              ├─ 否 → 输出并结束
 *                              └─ 是 → 判断工具能否本地跑
 *                                     ├─ 能 → 本地执行 → 结果入历史 → 回到「调模型」
 *                                     └─ 不能 → 挂起并返回待办给前端
 * </pre>
 *
 * <p>引擎本身不认识任何具体工具、上下文或模型，全部通过注册表解析，
 * 因此新增能力不需要改动这里。</p>
 */
@Slf4j
@Component
public class AgentRuntime {

    private final AgentRegistry agentRegistry;
    private final LlmProviderRegistry llmProviderRegistry;
    private final ToolExecutorRegistry toolExecutorRegistry;
    private final ContextProviderRegistry contextProviderRegistry;
    private final AgentToolRegistry toolSchemaRegistry;
    private final ConversationStore conversationStore;
    private final SystemPromptResolver promptResolver;

    public AgentRuntime(AgentRegistry agentRegistry,
                        LlmProviderRegistry llmProviderRegistry,
                        ToolExecutorRegistry toolExecutorRegistry,
                        ContextProviderRegistry contextProviderRegistry,
                        AgentToolRegistry toolSchemaRegistry,
                        ConversationStore conversationStore,
                        SystemPromptResolver promptResolver) {
        this.agentRegistry = agentRegistry;
        this.llmProviderRegistry = llmProviderRegistry;
        this.toolExecutorRegistry = toolExecutorRegistry;
        this.contextProviderRegistry = contextProviderRegistry;
        this.toolSchemaRegistry = toolSchemaRegistry;
        this.conversationStore = conversationStore;
        this.promptResolver = promptResolver;
    }

    /**
     * 执行一次 Agent 运行。
     *
     * @param request 运行请求
     * @param sink    事件输出端；传 {@link AgentEventSink#noop()} 即为完全静默
     */
    public AgentRunResult run(AgentRequest request, AgentEventSink sink) {
        AgentEventSink safeSink = sink != null ? sink : AgentEventSink.noop();

        Optional<Agent> routed = agentRegistry.route(request);
        if (!routed.isPresent()) {
            String message = "没有可用的 Agent（" + agentRegistry.size() + " 个已注册候选均不匹配）";
            log.warn("[agent-runtime] {}", message);
            safeSink.emit(AgentEvent.of("error", new JSONObject().set("message", message)));
            return AgentRunResult.failure(message);
        }

        Agent agent = routed.get();
        AgentDefinition definition = agent.getDefinition();
        ToolExecutionMode mode = request.getExecutionMode() != null
            ? request.getExecutionMode()
            : definition.getExecutionMode();

        if (request.getSessionKey() == null || request.getSessionKey().isEmpty()) {
            request.setSessionKey(conversationStore.newSessionKey());
        }

        AgentRunContext context = new AgentRunContext(request, definition, mode);
        String sessionKey = request.getSessionKey();

        Optional<LlmProvider> provider = llmProviderRegistry.resolve(definition.getLlmProviderId());
        if (!provider.isPresent()) {
            String message = "没有可用的 LLM 供应商";
            safeSink.emit(AgentEvent.of("error", new JSONObject().set("message", message)));
            return AgentRunResult.failure(message);
        }
        LlmProvider llm = provider.get();

        List<LlmMessage> conversation = conversationStore.loadHistory(sessionKey, 0);
        JSONArray tools = resolveTools(request, definition, context);

        String finalContent = "";
        List<PendingToolCall> pending = new ArrayList<>();
        List<String> executedTools = new ArrayList<>();
        boolean completed = false;
        boolean aborted = false;
        int turn = 0;

        while (turn < context.getMaxTurns()) {
            context.nextTurn();
            turn = context.getTurn();
            safeSink.emit(AgentEvent.of("turn",
                new JSONObject().set("turn", turn).set("maxTurns", context.getMaxTurns())));

            LlmChatRequest chatRequest = LlmChatRequest.builder()
                .messages(buildMessages(context, conversation, turn))
                .tools(tools)
                .temperature(definition.getTemperature())
                .stream(true)
                .build();

            LlmChatResponse response = llm.chat(chatRequest, token -> {
                context.recordChars(token.length());
                safeSink.emit(AgentEvent.of("token", new JSONObject().set("content", token)));
            });

            if (response.isError()) {
                String message = response.getErrorMessage();
                safeSink.emit(AgentEvent.of("error", new JSONObject().set("message", message)));
                return AgentRunResult.failure(message);
            }

            // assistant 消息入库
            String toolCallsJson = response.hasToolCalls() ? toToolCallsJson(response.getToolCalls()) : null;
            conversationStore.saveMessage(sessionKey, "assistant", response.getContent(), toolCallsJson, null);
            conversation.add(toAssistantMessage(response));

            if (!response.hasToolCalls()) {
                finalContent = response.getContent();
                completed = true;
                break;
            }

            // 逐个处理工具调用：本地执行 / 交前端 / 明确告知不可用
            boolean handOffToFrontend = false;
            for (LlmToolCall call : response.getToolCalls()) {
                boolean canRunLocally = toolExecutorRegistry.isBackendExecutable(call.getName());

                if (canRunLocally && mode == ToolExecutionMode.BACKEND) {
                    ToolResult executed = executeLocally(call, context, safeSink);
                    executedTools.add(call.getName());
                    conversationStore.saveMessage(sessionKey, "tool", executed.getPayload(), null, call.getId());
                    conversation.add(LlmMessage.tool(call.getId(), executed.getPayload()));
                    continue;
                }

                if (mode == ToolExecutionMode.FRONTEND) {
                    // 旧链路：把工具调用打包交给浏览器执行，前端执行完再回灌
                    pending.add(new PendingToolCall(call.getId(), call.getName(), call.getArguments(), null));
                    handOffToFrontend = true;
                    continue;
                }

                // 自治模式 + 只能在 UI 执行的工具：不要挂起等待，明确反馈给模型让它换路子
                ToolResult unavailable = ToolResult.unavailable(
                    "工具 " + call.getName() + " 需要浏览器界面，当前后端自治模式下不可用，请改用可在服务端完成的方式");
                safeSink.emit(AgentEvent.of("tool_result", new JSONObject()
                    .set("toolCallId", call.getId())
                    .set("name", call.getName())
                    .set("unavailable", true)
                    .set("payload", unavailable.getPayload())));
                conversationStore.saveMessage(sessionKey, "tool", unavailable.getPayload(), null, call.getId());
                conversation.add(LlmMessage.tool(call.getId(), unavailable.getPayload()));
            }

            if (handOffToFrontend) {
                finalContent = response.getContent();
                completed = true;
                break;
            }

            // 本地全部执行完，带着工具结果进入下一轮推理
        }

        if (!completed) {
            aborted = true;
            log.warn("[agent-runtime] session {} hit turn limit {}", sessionKey, context.getMaxTurns());
        }

        AgentRunResult result = AgentRunResult.success(finalContent, definition.getId(), sessionKey, turn);
        result.setAbortedByTurnLimit(aborted);
        result.setPendingToolCalls(pending);
        result.setExecutedTools(executedTools);
        return result;
    }

    // ---------------- 内部实现 ----------------

    private ToolResult executeLocally(LlmToolCall call, AgentRunContext context, AgentEventSink sink) {
        JSONObject args = parseArgs(call.getArguments());
        sink.emit(AgentEvent.of("tool_call", new JSONObject()
            .set("id", call.getId())
            .set("name", call.getName())
            .set("args", args)
            .set("executedBy", "backend")));

        Optional<ToolExecutor> executor = toolExecutorRegistry.get(call.getName());
        if (!executor.isPresent()) {
            ToolResult failure = ToolResult.unavailable("工具 " + call.getName() + " 没有后端执行器");
            sink.emit(AgentEvent.of("tool_result", new JSONObject()
                .set("toolCallId", call.getId()).set("payload", failure.getPayload())));
            return failure;
        }

        ToolResult result;
        try {
            result = executor.get().execute(args, context);
        } catch (Exception e) {
            log.warn("[agent-runtime] tool {} threw: {}", call.getName(), e.getMessage());
            result = ToolResult.fail("{\"error\":\"" + e.getMessage() + "\"}", "工具执行异常");
        }

        sink.emit(AgentEvent.of("tool_result", new JSONObject()
            .set("toolCallId", call.getId())
            .set("name", call.getName())
            .set("rejected", result.isRejected())
            .set("payload", result.getPayload())));
        return result;
    }

    private static JSONObject parseArgs(String raw) {
        if (raw == null || raw.trim().isEmpty()) {
            return new JSONObject();
        }
        try {
            return JSONUtil.parseObj(raw);
        } catch (Exception e) {
            return new JSONObject().set("_raw", raw);
        }
    }

    private List<LlmMessage> buildMessages(AgentRunContext context, List<LlmMessage> history, int turn) {
        List<LlmMessage> messages = new ArrayList<>();
        messages.add(LlmMessage.system(buildSystemPrompt(context, turn)));
        if (history != null) {
            messages.addAll(history);
        }
        return messages;
    }

    private String buildSystemPrompt(AgentRunContext context, int turn) {
        StringBuilder prompt = new StringBuilder(promptResolver.resolve(context.getDefinition(), context.getLocale()));

        if (context.getPageContext() != null && !context.getPageContext().isEmpty()) {
            prompt.append("\n\n## 当前页面上下文\n```json\n").append(context.getPageContext()).append("\n```");
        }

        String dynamicContext = contextProviderRegistry.assemble(
            context.getDefinition().getContextProviderIds(), context);
        if (dynamicContext != null) {
            prompt.append("\n\n## 可用上下文").append(dynamicContext);
        }

        if (context.isHeadless()) {
            prompt.append("\n\n## 运行模式\n")
                .append("当前为后端自治模式，没有浏览器参与。依赖界面的交互类工具不可用，")
                .append("请优先使用可在服务端完成的能力；遇到只能由用户完成的操作，")
                .append("直接说明需要用户做什么，不要尝试调用不可用的工具。");
        }

        if (turn > 1) {
            prompt.append("\n\n（这是第 ").append(turn).append(" 轮思考，工具结果已附在对话中，请基于结果继续或收尾。）");
        }
        return prompt.toString();
    }

    private JSONArray resolveTools(AgentRequest request, AgentDefinition definition, AgentRunContext context) {
        JSONArray all = toolSchemaRegistry.getToolsSchema(request.getPageContext());
        JSONArray filtered = new JSONArray();

        for (int i = 0; i < all.size(); i++) {
            JSONObject tool = all.getJSONObject(i);
            JSONObject function = tool.getJSONObject("function");
            String name = function != null ? function.getStr("name") : null;
            if (name == null) {
                continue;
            }
            // 未声明工具集合 = 全部可用
            if (definition.getToolNames() != null && !definition.getToolNames().isEmpty()
                && !definition.getToolNames().contains(name)) {
                continue;
            }
            // 自治模式下不把前端专属工具暴露给模型，避免它反复调一个注定失败的工具
            if (context != null && context.isHeadless()
                && toolExecutorRegistry.get(name).isPresent()
                && !toolExecutorRegistry.get(name).get().canRunOnBackend()) {
                continue;
            }
            filtered.add(tool);
        }
        return filtered;
    }

    private static LlmMessage toAssistantMessage(LlmChatResponse response) {
        LlmMessage message = LlmMessage.assistant(response.getContent());
        if (response.hasToolCalls()) {
            message.setToolCalls(new ArrayList<>(response.getToolCalls()));
        }
        return message;
    }

    private static String toToolCallsJson(List<LlmToolCall> calls) {
        JSONArray array = new JSONArray();
        for (LlmToolCall call : calls) {
            array.add(new JSONObject()
                .set("id", call.getId())
                .set("type", "function")
                .set("function", new JSONObject()
                    .set("name", call.getName())
                    .set("arguments", call.getArguments())));
        }
        return array.toString();
    }
}
