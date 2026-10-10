package cn.boommanpro.gaia.workflow.app.agent.runtime;

import cn.boommanpro.gaia.workflow.app.agent.core.Agent;
import cn.boommanpro.gaia.workflow.app.agent.core.AgentDefinition;
import cn.boommanpro.gaia.workflow.app.agent.core.AgentRegistry;
import cn.boommanpro.gaia.workflow.app.agent.core.AgentRequest;
import cn.boommanpro.gaia.workflow.app.agent.core.AgentRunContext;
import cn.boommanpro.gaia.workflow.app.agent.core.AgentRunResult;
import cn.boommanpro.gaia.workflow.app.agent.core.AgentRunResult.PendingToolCall;
import cn.boommanpro.gaia.workflow.app.agent.core.ConversationStore;
import cn.boommanpro.gaia.workflow.app.agent.core.SteeringInbox;
import cn.boommanpro.gaia.workflow.app.agent.core.ToolExecutionMode;
import cn.boommanpro.gaia.workflow.app.agent.core.ToolPolicyService;
import cn.boommanpro.gaia.workflow.app.agent.engine.AgentExecutionEngine;
import cn.boommanpro.gaia.workflow.app.agent.event.AgentEvent;
import cn.boommanpro.gaia.workflow.app.agent.event.AgentEventSink;
import cn.boommanpro.gaia.workflow.app.agent.llm.LlmChatRequest;
import cn.boommanpro.gaia.workflow.app.agent.llm.LlmChatResponse;
import cn.boommanpro.gaia.workflow.app.agent.llm.LlmMessage;
import cn.boommanpro.gaia.workflow.app.agent.llm.LlmProvider;
import cn.boommanpro.gaia.workflow.app.agent.llm.LlmProviderRegistry;
import cn.boommanpro.gaia.workflow.app.agent.llm.LlmRetryPolicy;
import cn.boommanpro.gaia.workflow.app.agent.llm.LlmToolCall;
import cn.boommanpro.gaia.workflow.app.agent.llm.TokenListener;
import cn.boommanpro.gaia.workflow.app.agent.context.ContextProviderRegistry;
import cn.boommanpro.gaia.workflow.app.agent.tool.ToolArgsValidator;
import cn.boommanpro.gaia.workflow.app.agent.tool.ToolErrorCode;
import cn.boommanpro.gaia.workflow.app.agent.tool.ToolExecutor;
import cn.boommanpro.gaia.workflow.app.agent.tool.ToolExecutorRegistry;
import cn.boommanpro.gaia.workflow.app.agent.tool.ToolResult;
import cn.boommanpro.gaia.workflow.app.config.AgentProperties;
import cn.boommanpro.gaia.workflow.app.service.AgentToolRegistry;
import cn.hutool.json.JSONArray;
import cn.hutool.json.JSONObject;
import cn.hutool.json.JSONUtil;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;

/**
 * Agent 运行时引擎 —— 系统的执行心脏（dsh 式自治循环）。
 *
 * <p>核心机制（本轮对齐 deepseek-harness）：</p>
 * <ul>
 *   <li><b>自然停止</b>：没有 maxTurns 硬上限。run 结束于模型不再调用工具；
 *       跑飞的防护交给护栏组合——连续失败熔断、同参数复读提醒、上下文压力压缩。</li>
 *   <li><b>协作式真中断</b>：轮边界 / 工具前后 / 重试等待都是取消检查点；
 *       未执行完的 tool call 合成中断结果回灌，保证 tool_call/result 配对完整。</li>
 *   <li><b>LLM 重试</b>：可重试错误码（RATE_LIMIT/SERVER/TIMEOUT/TRANSPORT/空响应）
 *       指数退避重试，重试事件先落日志再睡眠（durable-before-wait）。</li>
 *   <li><b>上下文经济学</b>：系统提示词 run 内构建一次（前缀缓存友好）；
 *       token 压力触发压缩（确定性剪枝 → 模型摘要）；超大工具结果 spill 成预览。</li>
 *   <li><b>steering</b>：run 进行中的用户新消息在 turn 边界注入当前对话。</li>
 *   <li><b>并行工具</b>：连续的可并发工具（纯读）进并行池，独占工具顺序栅栏。</li>
 *   <li><b>model-visible ⟺ logged</b>：llm_request / assistant_settled / tool_call /
 *       tool_result 全量落事件日志，请求可从日志重建。</li>
 * </ul>
 */
@Slf4j
@Component
public class AgentRuntime implements AgentExecutionEngine {

    public static final String ENGINE_ID = "local";

    private final AgentRegistry agentRegistry;
    private final LlmProviderRegistry llmProviderRegistry;
    private final ToolExecutorRegistry toolExecutorRegistry;
    private final ContextProviderRegistry contextProviderRegistry;
    private final AgentToolRegistry toolSchemaRegistry;
    private final ConversationStore conversationStore;
    private final SystemPromptResolver promptResolver;
    private final ToolPolicyService toolPolicyService;
    private final cn.boommanpro.gaia.workflow.app.agent.session.SessionArtifactStore artifactStore;
    /** 工具调用指标（缺 bean 时静默降级为不记录） */
    private final cn.boommanpro.gaia.workflow.infra.manage.service.AgentToolCallLogService toolCallLogService;
    private final ContextCompactor compactor;
    private final AgentProperties properties;

    public AgentRuntime(AgentRegistry agentRegistry,
                        LlmProviderRegistry llmProviderRegistry,
                        ToolExecutorRegistry toolExecutorRegistry,
                        ContextProviderRegistry contextProviderRegistry,
                        AgentToolRegistry toolSchemaRegistry,
                        ConversationStore conversationStore,
                        SystemPromptResolver promptResolver,
                        ToolPolicyService toolPolicyService,
                        cn.boommanpro.gaia.workflow.app.agent.session.SessionArtifactStore artifactStore,
                        cn.boommanpro.gaia.workflow.infra.manage.service.AgentToolCallLogService toolCallLogService,
                        ContextCompactor compactor,
                        AgentProperties properties) {
        this.agentRegistry = agentRegistry;
        this.llmProviderRegistry = llmProviderRegistry;
        this.toolExecutorRegistry = toolExecutorRegistry;
        this.contextProviderRegistry = contextProviderRegistry;
        this.toolSchemaRegistry = toolSchemaRegistry;
        this.conversationStore = conversationStore;
        this.promptResolver = promptResolver;
        this.toolPolicyService = toolPolicyService;
        this.artifactStore = artifactStore;
        this.toolCallLogService = toolCallLogService;
        this.compactor = compactor;
        this.properties = properties;
    }

    @Override
    public String id() {
        return ENGINE_ID;
    }

    @Override
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
        context.setSink(safeSink);
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

        // 系统提示词 run 内只构建一次：静态段（人格/规则）在前、动态段（页面/绑定）在后，
        // 且轮次无关 —— 跨轮字节级稳定，服务端前缀缓存才能命中
        String systemPrompt = buildSystemPrompt(context);

        String finalContent = "";
        List<PendingToolCall> pending = new ArrayList<>();
        List<String> executedTools = new ArrayList<>();
        boolean completed = false;
        boolean aborted = false;
        boolean interrupted = false;
        int turn = 0;
        RepeatToolGuard repeatGuard = new RepeatToolGuard();
        StringBuilder advisory = new StringBuilder();
        Long usageAnchor = null;

        ExecutorService parallelPool = Executors.newFixedThreadPool(
            Math.max(2, Runtime.getRuntime().availableProcessors() / 2), r -> {
                Thread t = new Thread(r, "agent-tool-parallel");
                t.setDaemon(true);
                return t;
            });

        try {
            while (true) {
                // ---- 检查点：协作式取消（轮边界） ----
                if (context.isInterrupted()) {
                    interrupted = true;
                    break;
                }

                // ---- steering：把 run 进行中到达的用户新消息注入当前对话 ----
                SteeringInbox inbox = context.getSteeringInbox();
                if (inbox != null && !inbox.isEmpty()) {
                    for (SteeringInbox.Message m : inbox.drain()) {
                        LlmMessage steering = LlmMessage.user(m.content);
                        if (m.images != null && !m.images.isEmpty()) {
                            steering.setImages(m.images);
                        }
                        conversation.add(steering);
                        safeSink.emit(AgentEvent.of("user_message", new JSONObject()
                            .set("content", m.content).set("steering", true)));
                    }
                }

                context.nextTurn();
                turn = context.getTurn();

                // ---- token 压力 → 上下文压缩（确定性剪枝 → 模型摘要） ----
                ContextCompactor.Result compaction = null;
                try {
                    compaction = compactor.compactIfNeeded(
                        sessionKey, systemPrompt, conversation, llm, definition.getTemperature(), usageAnchor);
                    if (compaction.compacted) {
                        safeSink.emit(AgentEvent.of("compaction", compaction.toJson()
                            .set("turn", turn)));
                    }
                } catch (Exception e) {
                    log.warn("[agent-runtime] compaction failed (ignored): {}", e.getMessage());
                }
                if (compaction != null && compactor.exceedsHardLimit(systemPrompt, conversation)) {
                    // 压缩后仍超出上下文窗口：带着放不进的请求重试只会持续报错，明确收束
                    String message = "上下文长度已超出模型窗口（压缩后仍超过 "
                        + properties.getLlm().getContextWindow() + " tokens），本次执行已停止。"
                        + "可以新开一个会话继续，或让 AI 先落版当前进度。";
                    conversationStore.saveMessage(sessionKey, "assistant", message, null, null);
                    safeSink.emit(AgentEvent.of("token", new JSONObject().set("content", message)));
                    finalContent = message;
                    completed = true;
                    aborted = true;
                    break;
                }

                safeSink.emit(AgentEvent.of("turn", new JSONObject()
                    .set("turn", turn)
                    .set("contextTokens", compaction != null ? compaction.tokensAfter
                        : compactor.estimateTotal(systemPrompt, conversation, usageAnchor))));

                // ---- 请求构造（advisory 提醒以视图注记注入，不持久化） ----
                List<LlmMessage> requestMessages = new ArrayList<>();
                requestMessages.add(LlmMessage.system(systemPrompt));
                requestMessages.addAll(conversation);
                if (advisory.length() > 0) {
                    requestMessages.add(LlmMessage.user("【系统提示】" + advisory));
                    advisory.setLength(0);
                }
                safeSink.emit(AgentEvent.of("llm_request", new JSONObject()
                    .set("turn", turn)
                    .set("messageCount", requestMessages.size())
                    .set("toolsCount", tools.size())
                    .set("contextTokens", TokenMeter.estimate(requestMessages))));

                LlmChatRequest chatRequest = LlmChatRequest.builder()
                    .messages(requestMessages)
                    .tools(tools)
                    .temperature(definition.getTemperature())
                    .stream(true)
                    .build();

                // ---- LLM 调用（可重试码退避重试） ----
                StringBuilder turnThinking = new StringBuilder();
                LlmChatResponse response = chatWithRetry(llm, chatRequest, new TokenListener() {
                    @Override
                    public void onToken(String token) {
                        context.recordChars(token.length());
                        safeSink.emit(AgentEvent.of("token", new JSONObject().set("content", token)));
                    }

                    @Override
                    public void onThinking(String chunk) {
                        if (chunk == null || chunk.isEmpty()) {
                            return;
                        }
                        turnThinking.append(chunk);
                        safeSink.emit(AgentEvent.of("thinking", new JSONObject().set("content", chunk)));
                    }
                }, context, safeSink);

                if (response.isError()) {
                    String message = response.getErrorMessage();
                    safeSink.emit(AgentEvent.of("error", new JSONObject().set("message", message)));
                    return AgentRunResult.failure(message);
                }
                if (response.getPromptTokens() != null) {
                    usageAnchor = response.getPromptTokens().longValue();
                }

                // 每轮 LLM 调用元信息：会话审查的调用日志 + 调试面板数据源（无订阅者时仅入总线快照）
                JSONObject turnMeta = new JSONObject()
                    .set("turn", turn)
                    .set("model", response.getModel())
                    .set("temperature", definition.getTemperature())
                    .set("messagesCount", conversation.size() + 1)
                    .set("toolsCount", tools.size())
                    .set("durationMs", response.getDurationMs())
                    .set("contentLength", response.getContent() != null ? response.getContent().length() : 0)
                    .set("thinkingLength", turnThinking.length())
                    .set("promptTokens", response.getPromptTokens())
                    .set("completionTokens", response.getCompletionTokens())
                    .set("toolCalls", toToolCallsJson(response.hasToolCalls() ? response.getToolCalls() : new ArrayList<>()));
                safeSink.emit(AgentEvent.of("llm_end", turnMeta));

                // assistant 消息入库；若回复包含 ::options（请求用户选择），不保留 tool_calls
                boolean hasOptions = response.getContent() != null && response.getContent().contains("::options");
                String toolCallsJson = (response.hasToolCalls() && !hasOptions)
                    ? toToolCallsJson(response.getToolCalls()) : null;
                conversationStore.saveMessage(sessionKey, "assistant", response.getContent(), toolCallsJson, null,
                    turnThinking.length() > 0 ? turnThinking.toString() : null);
                conversation.add(toAssistantMessage(response));
                // 结算事件（model-visible ⟺ logged 的 assistant 侧）：内容 + 工具调用全量落日志
                safeSink.emit(AgentEvent.of("assistant_settled", new JSONObject()
                    .set("turn", turn)
                    .set("content", response.getContent())
                    .set("thinkingLength", turnThinking.length())
                    .set("toolCalls", toolCallsJson != null ? JSONUtil.parseArray(toolCallsJson) : new JSONArray())));

                // ::options（等用户选择）或没有工具调用 → 本轮结束，等用户下一步（自然停止）
                if (!response.hasToolCalls() || hasOptions) {
                    finalContent = response.getContent();
                    completed = true;
                    break;
                }

                // ---- 工具调用执行（并行分段 + 顺序栅栏） ----
                boolean handOffToFrontend = false;
                List<LlmToolCall> calls = response.getToolCalls();
                int i = 0;
                while (i < calls.size()) {
                    // 检查点：工具批次之间的取消
                    if (context.isInterrupted()) {
                        // 未执行的调用合成中断结果回灌 —— assistant 的 tool_calls 已入库，
                        // 悬空配对会让下一次 run 的历史校验直接失败
                        for (int r = i; r < calls.size(); r++) {
                            LlmToolCall call = calls.get(r);
                            ToolResult cancelled = interruptedResult();
                            safeSink.emit(AgentEvent.of("tool_result", new JSONObject()
                                .set("toolCallId", call.getId())
                                .set("name", call.getName())
                                .set("payload", cancelled.getPayload())));
                            conversationStore.saveMessage(sessionKey, "tool", cancelled.getPayload(), null, call.getId());
                            conversation.add(LlmMessage.tool(call.getId(), cancelled.getPayload()));
                        }
                        interrupted = true;
                        break;
                    }

                    LlmToolCall call = calls.get(i);
                    boolean canRunLocally = toolExecutorRegistry.isBackendExecutable(call.getName());

                    if (canRunLocally && mode == ToolExecutionMode.BACKEND) {
                        if (isParallelEligible(call, mode)) {
                            // 收集连续可并发段，进并行池；结果按调用顺序收口（配对/落库顺序确定）
                            int j = i;
                            while (j < calls.size() && isParallelEligible(calls.get(j), mode)) {
                                j++;
                            }
                            List<Future<ToolResult>> futures = new ArrayList<>();
                            for (int k = i; k < j; k++) {
                                final LlmToolCall c = calls.get(k);
                                futures.add(parallelPool.submit(() -> executeLocally(c, context, safeSink)));
                            }
                            for (int k = i; k < j; k++) {
                                ToolResult executed;
                                try {
                                    executed = futures.get(k - i).get();
                                } catch (Exception e) {
                                    log.warn("[agent-runtime] parallel tool failed: {}", e.getMessage());
                                    executed = ToolResult.fail("{\"error\":\"" + e.getMessage() + "\"}", "工具执行异常");
                                }
                                settleToolResult(calls.get(k), executed, context, safeSink,
                                    conversation, executedTools, repeatGuard, advisory);
                            }
                            i = j;
                            continue;
                        }
                        ToolResult executed = executeLocally(call, context, safeSink);
                        settleToolResult(call, executed, context, safeSink,
                            conversation, executedTools, repeatGuard, advisory);
                        i++;
                        continue;
                    }

                    if (mode == ToolExecutionMode.FRONTEND) {
                        // 旧链路：把工具调用打包交给浏览器执行，前端执行完再回灌
                        pending.add(new PendingToolCall(call.getId(), call.getName(), call.getArguments(), null));
                        handOffToFrontend = true;
                        i++;
                        continue;
                    }

                    // 自治模式 + 只能在 UI 执行的工具：不要挂起等待，明确反馈给模型让它换路子
                    ToolResult unavailable = ToolResult.unavailable(
                        "工具 " + call.getName() + " 需要浏览器界面，当前后端自治模式下不可用，请改用可在服务端完成的方式");
                    settleToolResult(call, unavailable, context, safeSink,
                        conversation, executedTools, repeatGuard, advisory);
                    i++;
                }
                if (interrupted) {
                    break;
                }

                if (handOffToFrontend) {
                    finalContent = response.getContent();
                    completed = true;
                    break;
                }

                // 连续基础设施失败熔断：不再带着失败记录进入下一轮空转
                if (Boolean.TRUE.equals(context.getAttribute("forceStop", Boolean.class))) {
                    finalContent = "AI 连续多次提交了相同且无法通过校验的工具调用，本次执行已自动终止，避免无意义空转。"
                        + "请换个方式描述你的需求，或直接告诉 AI 缺少的关键信息。";
                    completed = true;
                    break;
                }
                // 本地全部执行完，带着工具结果进入下一轮推理
            }
        } finally {
            parallelPool.shutdown();
        }

        if (interrupted) {
            // 中断收尾：落一条可见的中断标记（刷新/切走后用户仍能看出 run 没跑完）
            String marker = "⏹ 本次运行已被中断。已完成的部分（草稿/已落版版本）保持有效。";
            try {
                conversationStore.saveMessage(sessionKey, "assistant", marker, null, null);
                safeSink.emit(AgentEvent.of("interrupted", new JSONObject().set("turn", turn)));
            } catch (Exception e) {
                log.warn("[agent-runtime] persist interrupted marker failed: {}", e.getMessage());
            }
        } else if (!completed) {
            aborted = true;
            log.warn("[agent-runtime] session {} aborted by guard", sessionKey);
        }

        // 占位未闭环提醒：模型在草稿上修了占位配置但没重新落版，线上版本仍是占位——
        // 用户此刻大概率以为「已创建成功就能跑」，必须把状态说破（落库 + 追加进本次回复）
        boolean appliedWithPlaceholderWarnings = Boolean.TRUE.equals(
            context.getAttribute("appliedWithPlaceholderWarnings", Boolean.class));
        boolean canvasEditAfterApply = Boolean.TRUE.equals(
            context.getAttribute("canvasEditAfterApply", Boolean.class));
        if (appliedWithPlaceholderWarnings && canvasEditAfterApply) {
            String reminder = "\n\n---\n⚠️ **系统提醒**：AI 在草稿上修正了占位配置，但没有重新落版——"
                + "线上生效版本仍包含占位内容，直接运行可能不符合预期。"
                + "发送「重新落版」让修正生效，或到编辑器确认后手动保存。";
            try {
                conversationStore.saveMessage(sessionKey, "assistant", reminder.trim(), null, null);
                safeSink.emit(AgentEvent.of("token", new JSONObject().set("content", reminder)));
            } catch (Exception e) {
                log.warn("[agent-runtime] persist placeholder reminder failed: {}", e.getMessage());
            }
        }

        AgentRunResult result = AgentRunResult.success(finalContent, definition.getId(), sessionKey, turn);
        result.setAbortedByTurnLimit(aborted);
        result.setInterrupted(interrupted);
        result.setPendingToolCalls(pending);
        result.setExecutedTools(executedTools);
        return result;
    }

    // ---------------- 内部实现 ----------------

    /** 该调用能否进并行段：后端可执行 + 声明 concurrencySafe 的纯读工具 */
    private boolean isParallelEligible(LlmToolCall call, ToolExecutionMode mode) {
        if (mode != ToolExecutionMode.BACKEND || !toolExecutorRegistry.isBackendExecutable(call.getName())) {
            return false;
        }
        Optional<ToolExecutor> executor = toolExecutorRegistry.get(call.getName());
        return executor.isPresent() && executor.get().concurrencySafe();
    }

    /**
     * 工具结果收口：事件外发 + spill + 入库 + 进对话 + 占位闭环跟踪 + 复读护栏。
     */
    private void settleToolResult(LlmToolCall call, ToolResult executed, AgentRunContext context,
                                  AgentEventSink sink, List<LlmMessage> conversation,
                                  List<String> executedTools, RepeatToolGuard repeatGuard,
                                  StringBuilder advisory) {
        String sessionKey = context.getSessionKey();

        sink.emit(AgentEvent.of("tool_result", new JSONObject()
            .set("toolCallId", call.getId())
            .set("name", call.getName())
            .set("rejected", executed.isRejected())
            .set("payload", executed.getPayload())));
        executedTools.add(call.getName());

        // 复读护栏（advisory）：同参数第 3/5/8 次时提醒模型换策略
        JSONObject args = parseArgsQuiet(call.getArguments());
        String reminder = repeatGuard.record(call.getName(), args);
        if (reminder != null) {
            if (advisory.length() > 0) {
                advisory.append('\n');
            }
            advisory.append(reminder);
            sink.emit(AgentEvent.of("repeat_reminder", new JSONObject()
                .set("tool", call.getName()).set("message", reminder)));
        }

        // spill（大结果只给模型看预览；完整内容已在事件日志与消息表）
        conversationStore.saveMessage(sessionKey, "tool", executed.getPayload(), null, call.getId());
        conversation.add(LlmMessage.tool(call.getId(), spillForModel(executed.getPayload())));

        // 占位闭环跟踪（详见 appliedWithPlaceholderWarnings 声明处）
        if (executed.isSuccess()) {
            if ("write_workflow".equals(call.getName()) || "save_workflow".equals(call.getName())) {
                context.setAttribute("appliedWithPlaceholderWarnings",
                    hasPlaceholderWarnings(executed.getPayload()));
                context.setAttribute("canvasEditAfterApply", Boolean.FALSE);
            } else if (Boolean.TRUE.equals(context.getAttribute("appliedWithPlaceholderWarnings", Boolean.class))
                && "edit_workflow".equals(call.getName())) {
                context.setAttribute("canvasEditAfterApply", Boolean.TRUE);
            }
        }
    }

    /** 超大结果 → head/tail 预览 + 取回指引（dsh spill 语义；完整内容留在日志/消息表） */
    private String spillForModel(String payload) {
        AgentProperties.Spill config = properties.getSpill();
        if (payload == null || !config.isEnabled() || payload.length() <= config.getMaxInlineChars()) {
            return payload;
        }
        int head = Math.min(config.getHeadChars(), payload.length());
        int tail = Math.min(config.getTailChars(), payload.length() - head);
        return payload.substring(0, head)
            + "\n…（内容过长：已省略 " + (payload.length() - head - tail)
            + " 字符。完整结果保存在会话记录中；需要最新状态请重新调用工具读取）\n"
            + payload.substring(payload.length() - tail);
    }

    private static ToolResult interruptedResult() {
        JSONObject error = new JSONObject()
            .set("code", "INTERRUPTED")
            .set("message", "运行已被用户中断，此工具调用未执行。");
        return ToolResult.fail(error.toString(), "运行已被中断", ToolErrorCode.EXEC_ERROR);
    }

    /** LLM 调用 + 重试（可重试码驱动；重试事件先落日志再睡眠） */
    private LlmChatResponse chatWithRetry(LlmProvider llm, LlmChatRequest request, TokenListener listener,
                                          AgentRunContext context, AgentEventSink sink) {
        LlmChatResponse response;
        for (int attempt = 1; ; attempt++) {
            response = llm.chat(request, listener);

            boolean failed = response.isError();
            boolean empty = !failed && LlmRetryPolicy.isEmptyResponse(response);
            if (!failed && !empty) {
                return response;
            }
            String code = failed ? response.getErrorCode() : "EMPTY_RESPONSE";
            boolean retryable = failed ? response.isRetryable() : true;
            if (attempt >= LlmRetryPolicy.MAX_ATTEMPTS || !retryable) {
                if (empty) {
                    return LlmChatResponse.failed(
                        "LLM 返回了空响应（已重试 " + Math.max(0, attempt - 1) + " 次）", "EMPTY_RESPONSE");
                }
                return response;
            }
            long delay = LlmRetryPolicy.backoffMs(attempt);
            // durable-before-wait：先把重试决定写进日志，再进入等待
            sink.emit(AgentEvent.of("llm_retry", new JSONObject()
                .set("attempt", attempt)
                .set("code", code)
                .set("delayMs", delay)
                .set("message", failed ? response.getErrorMessage() : "空响应")));
            if (!interruptibleSleep(delay, context)) {
                return LlmChatResponse.failed("运行已中断", "INTERRUPTED");
            }
        }
    }

    /** 分片睡眠：每 200ms 检查一次取消，避免长退避阻塞中断 */
    private static boolean interruptibleSleep(long delayMs, AgentRunContext context) {
        long deadline = System.currentTimeMillis() + delayMs;
        while (System.currentTimeMillis() < deadline) {
            if (context.isInterrupted()) {
                return false;
            }
            try {
                Thread.sleep(Math.min(200, Math.max(1, deadline - System.currentTimeMillis())));
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                return false;
            }
        }
        return !context.isInterrupted();
    }

    private ToolResult executeLocally(LlmToolCall call, AgentRunContext context, AgentEventSink sink) {
        JSONObject args = parseArgs(call.getArguments());
        long startedAt = System.currentTimeMillis();
        sink.emit(AgentEvent.of("tool_call", new JSONObject()
            .set("id", call.getId())
            .set("name", call.getName())
            .set("args", args)
            .set("executedBy", "backend")));

        // 参数 JSON 完整性：流式 arguments 拼接截断/非法转义时 parseObj 失败落入 _raw 通道，
        // 必须在此拦截（否则后续所有 required 校验形同虚设）
        if (args.containsKey("_raw")) {
            ToolResult broken = ToolResult.fail(
                new JSONObject().set("error", new JSONObject()
                    .set("code", "INVALID_ARGS")
                    .set("message", "工具参数不是合法 JSON（可能被截断，常见于超长 id/字段）。"
                        + "请重新发送完整、精简的参数：id 用短语义名（如 http_1），不要拼接长数字串")).toString(),
                "参数 JSON 解析失败", ToolErrorCode.INVALID_ARGS);
            recordToolCallMetric(context, call, broken, args, startedAt);
            trackFailureStreak(context, call.getName(), broken);
            return broken;
        }

        // 参数 schema 校验（dsh「执行前强校验」）：违规在门禁/执行之前拦截，
        // 错误带 path 级修复指引直接回传模型，一轮自修，不浪费确认卡与执行开销
        JSONObject paramsSchema = toolSchemaRegistry.getToolParameters(call.getName());
        if (paramsSchema != null) {
            List<ToolArgsValidator.Violation> violations =
                ToolArgsValidator.validate(paramsSchema, args);
            if (!violations.isEmpty()) {
                ToolResult invalid = ToolResult.invalidArgs(violations, null);
                recordToolCallMetric(context, call, invalid, args, startedAt);
                // 参数违规不计入熔断（模型自省范畴，交给复读护栏），但要跟踪序列归零以外的情况
                trackFailureStreak(context, call.getName(), invalid);
                return invalid;
            }
        }

        // 策略门禁：forbid → 拒绝；confirm → 按配置决策（auto-approve / auto-reject / require）
        Optional<ToolExecutor> executor = toolExecutorRegistry.get(call.getName());
        String policy = toolPolicyService.resolvePolicy(context.getSessionKey(), call.getName());
        if ("forbid".equals(policy)) {
            ToolResult rejected = ToolResult.rejected("该操作已被权限策略禁止");
            recordToolCallMetric(context, call, rejected, args, startedAt);
            return rejected;
        }
        if ("confirm".equals(policy)) {
            // 弹确认卡之前先做无副作用预校验：参数非法直接回传模型补全，不消耗用户确认
            if (executor.isPresent()) {
                try {
                    ToolResult pre = executor.get().preValidate(args);
                    if (pre != null) {
                        recordToolCallMetric(context, call, pre, args, startedAt);
                        return pre;
                    }
                } catch (Exception e) {
                    log.warn("[agent-runtime] preValidate {} threw: {}", call.getName(), e.getMessage());
                }
            }
            boolean approved = toolPolicyService.decideConfirm(context, call, sink);
            if (!approved) {
                ToolResult rejected = ToolResult.rejected("用户未确认该操作");
                recordToolCallMetric(context, call, rejected, args, startedAt);
                return rejected;
            }
        }

        if (!executor.isPresent()) {
            ToolResult failure = ToolResult.unavailable("工具 " + call.getName() + " 没有后端执行器");
            recordToolCallMetric(context, call, failure, args, startedAt);
            return failure;
        }

        ToolResult result;
        try {
            result = executor.get().execute(args, context);
        } catch (Exception e) {
            log.warn("[agent-runtime] tool {} threw: {}", call.getName(), e.getMessage());
            result = ToolResult.fail("{\"error\":\"" + e.getMessage() + "\"}", "工具执行异常");
        }

        // 连续失败熔断（仅基础设施类失败计数；参数错/未找到/CAS 冲突是模型可自修的正常信号）
        result = trackFailureStreak(context, call.getName(), result);
        recordToolCallMetric(context, call, result, args, startedAt);
        return result;
    }

    /**
     * 熔断序列维护。分类对齐 dsh 重试哲学：只有基础设施类失败（EXEC_ERROR/TIMEOUT/
     * UNAVAILABLE/UNKNOWN）累计触发熔断；INVALID_ARGS/NOT_FOUND/STALE_REVISION/
     * REJECTED_POLICY 属于模型可自修信号，交给复读护栏用 advisory 提醒处理。
     */
    private ToolResult trackFailureStreak(AgentRunContext context, String toolName, ToolResult result) {
        if (!countsTowardCircuit(result)) {
            return result;
        }
        if (result.isSuccess()) {
            context.setAttribute("failStreak:" + toolName, 0);
            return result;
        }
        Integer streak = context.getAttribute("failStreak:" + toolName, Integer.class);
        int next = streak != null ? streak + 1 : 1;
        context.setAttribute("failStreak:" + toolName, next);
        if (next >= 4) {
            log.warn("[agent-runtime] session {} tool {} failed {} times in a row, aborting run",
                context.getSessionKey(), toolName, next);
            context.setAttribute("forceStop", Boolean.TRUE);
            JSONObject error = new JSONObject()
                .set("code", "CIRCUIT_BROKEN")
                .set("message", "连续 " + next + " 次调用失败，本次执行已终止。");
            return ToolResult.fail(error.toString(),
                "同一工具连续失败，已终止执行。请直接用正文向用户说明需要哪些关键信息，不要再重试。",
                ToolErrorCode.EXEC_ERROR);
        }
        return result;
    }

    private static boolean countsTowardCircuit(ToolResult result) {
        if (result.isSuccess() || result.isRejected()) {
            return false;
        }
        ToolErrorCode code = result.getErrorCode();
        if (code == null) {
            return true;
        }
        switch (code) {
            case INVALID_ARGS:
            case NOT_FOUND:
            case STALE_REVISION:
            case REJECTED_POLICY:
                return false;
            default:
                return true;
        }
    }

    /** 工具调用指标落库（agent_tool_call_log）：结局码 + 耗时 + 参数摘要 */
    private void recordToolCallMetric(AgentRunContext context, LlmToolCall call, ToolResult result,
                                      JSONObject args, long startedAt) {
        if (toolCallLogService == null) {
            return;
        }
        try {
            cn.boommanpro.gaia.workflow.infra.manage.entity.AgentToolCallLog row =
                new cn.boommanpro.gaia.workflow.infra.manage.entity.AgentToolCallLog();
            row.setSessionKey(context.getSessionKey());
            row.setRunId(context.getRequest().getRunId());
            row.setTurn(context.getTurn());
            row.setToolName(call.getName());
            row.setOutcome(outcomeOf(result));
            row.setErrorCode(result.getErrorCode() != null ? result.getErrorCode().name() : null);
            row.setDurationMs(System.currentTimeMillis() - startedAt);
            String argsText = args != null ? args.toString() : "";
            row.setArgsDigest(argsText.length() > 2000 ? argsText.substring(0, 2000) + "…" : argsText);
            row.setCreatedAt(java.time.LocalDateTime.now().toString());
            toolCallLogService.save(row);
        } catch (Exception e) {
            log.debug("[agent-runtime] metric persist failed (ignored): {}", e.getMessage());
        }
    }

    /** 结局码映射（指标口径） */
    private static String outcomeOf(ToolResult result) {
        if (result.isSuccess()) {
            return "SUCCESS";
        }
        if (result.isRejected()) {
            return "REJECTED_POLICY";
        }
        if (result.getErrorCode() != null) {
            switch (result.getErrorCode()) {
                case INVALID_ARGS:
                    return "INVALID_ARGS";
                case NOT_FOUND:
                    return "NOT_FOUND";
                case STALE_REVISION:
                    return "STALE_REVISION";
                case TIMEOUT:
                    return "TIMEOUT";
                case UNAVAILABLE_SURFACE:
                case UNKNOWN_TOOL:
                    return "UNAVAILABLE_SURFACE";
                default:
                    break;
            }
        }
        return "EXEC_ERROR";
    }

    private static JSONObject parseArgs(String raw) {
        if (raw == null || raw.trim().isEmpty()) {
            return new JSONObject();
        }
        try {
            return JSONUtil.parseObj(raw);
        } catch (Exception e) {
            // 容错修复（弱模型实测高发：数字串复读导致 JSON 截断）：
            // 1) 截断超长数字串（≥20 位连数字视为复读病理）
            // 2) 仍失败时补右花括号/右引号再试
            String repaired = raw.replaceAll("(\\d{4})\\d{16,}", "$1");
            try {
                return JSONUtil.parseObj(repaired);
            } catch (Exception ignore) {
                // fallthrough 到补括号
            }
            // 截断常发生在字符串值中间：剥掉悬挂的半截 key:value（, "id": "http_1111 → 丢弃）
            // 之后 balance 补栈就能得到结构合法的 JSON（被丢的字段由 ref/默认值兜底）
            String trimmed = repaired.replaceFirst(",\\s*\"[^\"]*\"\\s*:\\s*\"[^\"]*$", "");
            String balanced = balanceJson(trimmed);
            if (balanced != null) {
                try {
                    return JSONUtil.parseObj(balanced);
                } catch (Exception e2) {
                    log.warn("[agent-runtime] args repair failed after balance: {} | balanced tail: {}",
                        e2.getMessage(), balanced.substring(Math.max(0, balanced.length() - 160)));
                }
            } else {
                log.warn("[agent-runtime] args balance returned null | repaired tail: {}",
                    repaired.substring(Math.max(0, repaired.length() - 160)));
            }
            return new JSONObject().set("_raw", raw);
        }
    }

    /** 复读护栏用的安静解析：失败时返回空对象（不影响计数语义即可） */
    private static JSONObject parseArgsQuiet(String raw) {
        try {
            return parseArgs(raw);
        } catch (Exception e) {
            return new JSONObject();
        }
    }

    /** 简单 JSON 补全：按栈补右引号/右括号（截断的 arguments 常见） */
    private static String balanceJson(String text) {
        if (text == null || text.trim().isEmpty()) {
            return null;
        }
        StringBuilder sb = new StringBuilder(text.trim());
        // 去掉尾部明显不完整的转义或半截 key
        while (sb.length() > 0 && (sb.charAt(sb.length() - 1) == '\\' || sb.charAt(sb.length() - 1) == ',')) {
            sb.setLength(sb.length() - 1);
        }
        java.util.Deque<Character> stack = new java.util.ArrayDeque<>();
        boolean inString = false;
        char prev = 0;
        for (int i = 0; i < sb.length(); i++) {
            char c = sb.charAt(i);
            if (inString) {
                if (c == '"' && prev != '\\') {
                    inString = false;
                }
            } else {
                if (c == '"') {
                    inString = true;
                } else if (c == '{' || c == '[') {
                    stack.push(c);
                } else if (c == '}' || c == ']') {
                    if (!stack.isEmpty()) {
                        stack.pop();
                    } else {
                        return null; // 结构错乱，不修
                    }
                }
            }
            prev = c;
        }
        if (inString) {
            sb.append('"');
        }
        while (!stack.isEmpty()) {
            char open = stack.pop();
            sb.append(open == '{' ? '}' : ']');
        }
        return sb.toString();
    }

    /** 工具结果 payload 里是否带占位类 warnings（write/save 落版返回） */
    private static boolean hasPlaceholderWarnings(String payload) {
        if (payload == null || !payload.contains("warnings")) {
            return false;
        }
        try {
            JSONArray warnings = JSONUtil.parseObj(payload).getJSONArray("warnings");
            return warnings != null && !warnings.isEmpty();
        } catch (Exception e) {
            return false;
        }
    }

    /**
     * 系统提示词（run 内构建一次、轮次无关 —— 前缀缓存友好）。
     *
     * <p>静态段（人格 + 规则）在前；动态段（页面上下文 / 绑定工作流 / 上下文提供者）
     * 在后且 run 内不变。历史上这里的「第 N 轮思考」后缀每轮改写整个前缀，
     * 会让服务端 prompt 缓存每轮全量 miss —— 已移除，轮次感由工具结果本身传达。</p>
     */
    private String buildSystemPrompt(AgentRunContext context) {
        StringBuilder prompt = new StringBuilder(promptResolver.resolve(context.getDefinition(), context.getLocale()));

        if (context.getPageContext() != null && !context.getPageContext().isEmpty()) {
            prompt.append("\n\n## 当前页面上下文\n```json\n").append(context.getPageContext()).append("\n```");
        }

        // D2 发起会话迭代：本会话画布基于某个已有工作流的落版复制而来。
        // 不注入这条信息，模型只能从 pageContext 猜编码（实测会拿会话 key 当 workflowCode 瞎查）
        try {
            cn.boommanpro.gaia.workflow.infra.manage.entity.AgentArtifact wfArtifact =
                artifactStore.getLatest(context.getSessionKey(), "workflow");
            if (wfArtifact != null && wfArtifact.getSummary() != null) {
                java.util.regex.Matcher matcher =
                    java.util.regex.Pattern.compile("wf_[a-zA-Z0-9_]+").matcher(wfArtifact.getSummary());
                if (matcher.find()) {
                    String boundCode = matcher.group();
                    prompt.append("\n\n## 当前会话绑定的工作流")
                        .append("\n本会话的画布草稿基于已有工作流 `").append(boundCode)
                        .append("` 迭代（").append(wfArtifact.getSummary()).append("）。")
                        .append("\n- 修改后落版：直接用 save_workflow 保存当前草稿，无需指定 workflowCode")
                        .append("\n- 查询详情：workflowCode 是 `").append(boundCode)
                        .append("`；**不要**把会话 key 当作工作流编码");
                }
            }
        } catch (Exception e) {
            log.debug("[agent-runtime] inject bound workflow context failed: {}", e.getMessage());
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

        prompt.append("\n\n## 工作方式\n")
            .append("工具结果就附在对话中：基于结果继续推进或收尾即可，不需要重读刚刚返回的信息。");
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
