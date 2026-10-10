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
import cn.boommanpro.gaia.workflow.app.agent.core.ToolPolicyService;
import cn.boommanpro.gaia.workflow.app.agent.engine.AgentExecutionEngine;
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

    public AgentRuntime(AgentRegistry agentRegistry,
                        LlmProviderRegistry llmProviderRegistry,
                        ToolExecutorRegistry toolExecutorRegistry,
                        ContextProviderRegistry contextProviderRegistry,
                        AgentToolRegistry toolSchemaRegistry,
                        ConversationStore conversationStore,
                        SystemPromptResolver promptResolver,
                        ToolPolicyService toolPolicyService,
                        cn.boommanpro.gaia.workflow.app.agent.session.SessionArtifactStore artifactStore,
                        cn.boommanpro.gaia.workflow.infra.manage.service.AgentToolCallLogService toolCallLogService) {
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
    }

    @Override
    public String id() {
        return ENGINE_ID;
    }

    /**
     * 执行一次 Agent 运行。
     *
     * @param request 运行请求
     * @param sink    事件输出端；传 {@link AgentEventSink#noop()} 即为完全静默
     */
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
        // 把输出端注入上下文：工具可用 context.emit(...) 广播自定义事件（document / plan / ui_action）
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

        String finalContent = "";
        List<PendingToolCall> pending = new ArrayList<>();
        List<String> executedTools = new ArrayList<>();
        boolean completed = false;
        boolean aborted = false;
        int turn = 0;
        // 占位闭环跟踪：applyWorkflow 落版带占位警告后，模型若只在画布上修正而不再落版，
        // 线上生效版本会一直是占位配置（弱模型实测高发）——run 结束时对用户明确提醒
        boolean appliedWithPlaceholderWarnings = false;
        boolean canvasEditAfterApply = false;

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

            StringBuilder turnThinking = new StringBuilder();
            LlmChatResponse response = llm.chat(chatRequest, new cn.boommanpro.gaia.workflow.app.agent.llm.TokenListener() {
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
            });

            if (response.isError()) {
                String message = response.getErrorMessage();
                safeSink.emit(AgentEvent.of("error", new JSONObject().set("message", message)));
                return AgentRunResult.failure(message);
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
                .set("toolCalls", toToolCallsJson(response.hasToolCalls() ? response.getToolCalls() : new ArrayList<>()));
            safeSink.emit(AgentEvent.of("llm_end", turnMeta));

            // assistant 消息入库；若回复包含 ::options（请求用户选择），不保留 tool_calls
            boolean hasOptions = response.getContent() != null && response.getContent().contains("::options");
            String toolCallsJson = (response.hasToolCalls() && !hasOptions)
                ? toToolCallsJson(response.getToolCalls()) : null;
            conversationStore.saveMessage(sessionKey, "assistant", response.getContent(), toolCallsJson, null,
                turnThinking.length() > 0 ? turnThinking.toString() : null);
            conversation.add(toAssistantMessage(response));

            // ::options（等用户选择）或没有工具调用 → 本轮结束，等用户下一步
            if (!response.hasToolCalls() || hasOptions) {
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
                    // 占位闭环跟踪（详见 appliedWithPlaceholderWarnings 声明处）
                    if (executed.isSuccess()) {
                        if ("write_workflow".equals(call.getName()) || "save_workflow".equals(call.getName())) {
                            // 落版（整写/草稿保存）都算闭环起点：线上版本已更新
                            appliedWithPlaceholderWarnings = hasPlaceholderWarnings(executed.getPayload());
                            canvasEditAfterApply = false;
                        } else if (appliedWithPlaceholderWarnings && "edit_workflow".equals(call.getName())) {
                            canvasEditAfterApply = true;
                        }
                    }
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

            // 连续相同失败熔断：不再带着失败记录进入下一轮空转
            if (Boolean.TRUE.equals(context.getAttribute("forceStop", Boolean.class))) {
                finalContent = "AI 连续多次提交了相同且无法通过校验的工具调用，本次执行已自动终止，避免无意义空转。"
                    + "请换个方式描述你的需求，或直接告诉 AI 缺少的关键信息。";
                completed = true;
                break;
            }

            // 本地全部执行完，带着工具结果进入下一轮推理
        }

        if (!completed) {
            aborted = true;
            log.warn("[agent-runtime] session {} hit turn limit {}", sessionKey, context.getMaxTurns());
        }

        // 占位未闭环提醒：模型在草稿上修了占位配置但没重新落版，线上版本仍是占位——
        // 用户此刻大概率以为「已创建成功就能跑」，必须把状态说破（落库 + 追加进本次回复）
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
        result.setPendingToolCalls(pending);
        result.setExecutedTools(executedTools);
        return result;
    }

    // ---------------- 内部实现 ----------------

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
                "参数 JSON 解析失败", cn.boommanpro.gaia.workflow.app.agent.tool.ToolErrorCode.INVALID_ARGS);
            sink.emit(AgentEvent.of("tool_result", new JSONObject()
                .set("toolCallId", call.getId())
                .set("name", call.getName())
                .set("rejected", false)
                .set("payload", broken.getPayload())));
            recordToolCallMetric(context, call, broken, args, startedAt);
            trackFailureStreak(context, call.getName(), broken);
            return broken;
        }

        // 参数 schema 校验（dsh「执行前强校验」）：违规在门禁/执行之前拦截，
        // 错误带 path 级修复指引直接回传模型，一轮自修，不浪费确认卡与执行开销
        cn.hutool.json.JSONObject paramsSchema = toolSchemaRegistry.getToolParameters(call.getName());
        if (paramsSchema != null) {
            java.util.List<cn.boommanpro.gaia.workflow.app.agent.tool.ToolArgsValidator.Violation> violations =
                cn.boommanpro.gaia.workflow.app.agent.tool.ToolArgsValidator.validate(paramsSchema, args);
            if (!violations.isEmpty()) {
                ToolResult invalid = cn.boommanpro.gaia.workflow.app.agent.tool.ToolResult.invalidArgs(violations, null);
                sink.emit(AgentEvent.of("tool_result", new JSONObject()
                    .set("toolCallId", call.getId())
                    .set("name", call.getName())
                    .set("rejected", false)
                    .set("payload", invalid.getPayload())));
                recordToolCallMetric(context, call, invalid, args, startedAt);
                // 参数违规同样计入熔断序列：模型反复发同样坏的参数是死循环信号
                trackFailureStreak(context, call.getName(), invalid);
                return invalid;
            }
        }

        // 策略门禁：forbid → 拒绝；confirm → 按配置决策（auto-approve / auto-reject / require）
        Optional<ToolExecutor> executor = toolExecutorRegistry.get(call.getName());
        String policy = toolPolicyService.resolvePolicy(context.getSessionKey(), call.getName());
        if ("forbid".equals(policy)) {
            ToolResult rejected = ToolResult.rejected("该操作已被权限策略禁止");
            sink.emit(AgentEvent.of("tool_result", new JSONObject()
                .set("toolCallId", call.getId())
                .set("name", call.getName())
                .set("rejected", true)
                .set("payload", rejected.getPayload())));
            recordToolCallMetric(context, call, rejected, args, startedAt);
            return rejected;
        }
        if ("confirm".equals(policy)) {
            // 弹确认卡之前先做无副作用预校验：参数非法直接回传模型补全，不消耗用户确认
            if (executor.isPresent()) {
                try {
                    ToolResult pre = executor.get().preValidate(args);
                    if (pre != null) {
                        sink.emit(AgentEvent.of("tool_result", new JSONObject()
                            .set("toolCallId", call.getId())
                            .set("name", call.getName())
                            .set("rejected", pre.isRejected())
                            .set("payload", pre.getPayload())));
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
                sink.emit(AgentEvent.of("tool_result", new JSONObject()
                    .set("toolCallId", call.getId())
                    .set("name", call.getName())
                    .set("rejected", true)
                    .set("payload", rejected.getPayload())));
                recordToolCallMetric(context, call, rejected, args, startedAt);
                return rejected;
            }
        }

        if (!executor.isPresent()) {
            ToolResult failure = ToolResult.unavailable("工具 " + call.getName() + " 没有后端执行器");
            sink.emit(AgentEvent.of("tool_result", new JSONObject()
                .set("toolCallId", call.getId()).set("payload", failure.getPayload())));
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

        // 连续失败熔断：弱模型容易反复提交非法参数空转（实测连发 7~10 次），
        // 同一工具连续失败 4 次即强制终止本轮 run，把死循环转化为对用户的明确说明。
        result = trackFailureStreak(context, call.getName(), result);

        sink.emit(AgentEvent.of("tool_result", new JSONObject()
            .set("toolCallId", call.getId())
            .set("name", call.getName())
            .set("rejected", result.isRejected())
            .set("payload", result.getPayload())));
        recordToolCallMetric(context, call, result, args, startedAt);
        return result;
    }

    /** 熔断序列维护（含 schema 校验失败的路径） */
    private ToolResult trackFailureStreak(AgentRunContext context, String toolName, ToolResult result) {
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
                cn.boommanpro.gaia.workflow.app.agent.tool.ToolErrorCode.EXEC_ERROR);
        }
        return result;
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

    /** 工具结果 payload 里是否带占位类 warnings（applyWorkflow / saveWorkflow 落版返回） */
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
