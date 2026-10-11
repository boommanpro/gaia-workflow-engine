package cn.boommanpro.gaia.workflow.app.agent.engine;

import cn.boommanpro.gaia.workflow.app.agent.core.Agent;
import cn.boommanpro.gaia.workflow.app.agent.core.AgentDefinition;
import cn.boommanpro.gaia.workflow.app.agent.core.AgentRegistry;
import cn.boommanpro.gaia.workflow.app.agent.core.AgentRequest;
import cn.boommanpro.gaia.workflow.app.agent.core.AgentRunContext;
import cn.boommanpro.gaia.workflow.app.agent.core.AgentRunResult;
import cn.boommanpro.gaia.workflow.app.agent.core.ConversationStore;
import cn.boommanpro.gaia.workflow.app.agent.core.SteeringInbox;
import cn.boommanpro.gaia.workflow.app.agent.runtime.SystemPromptResolver;
import cn.boommanpro.gaia.workflow.app.config.AgentProperties;
import cn.boommanpro.gaia.workflow.app.agent.event.AgentEvent;
import cn.boommanpro.gaia.workflow.app.agent.event.AgentEventSink;
import cn.boommanpro.gaia.workflow.app.agent.llm.LlmMessage;
import cn.boommanpro.gaia.workflow.app.agent.llm.LlmToolCall;
import cn.boommanpro.gaia.workflow.app.agent.runtime.RepeatToolGuard;
import cn.boommanpro.gaia.workflow.app.agent.runtime.WrapUpGuard;
import cn.boommanpro.gaia.workflow.app.agent.tool.AgentScopeToolAdapter;
import cn.boommanpro.gaia.workflow.app.agent.tool.ToolArgsValidator;
import cn.boommanpro.gaia.workflow.app.agent.tool.ToolErrorCode;
import cn.boommanpro.gaia.workflow.app.agent.tool.ToolExecutor;
import cn.boommanpro.gaia.workflow.app.agent.tool.ToolExecutorRegistry;
import cn.boommanpro.gaia.workflow.app.agent.tool.ToolResult;
import cn.boommanpro.gaia.workflow.app.service.AgentModelConfigService;
import cn.boommanpro.gaia.workflow.app.service.AgentToolRegistry;
import cn.boommanpro.gaia.workflow.infra.manage.entity.AgentLlmCallLog;
import cn.boommanpro.gaia.workflow.infra.manage.entity.AgentToolCallLog;
import cn.boommanpro.gaia.workflow.infra.manage.entity.AgentToolDefinition;
import cn.boommanpro.gaia.workflow.infra.manage.service.AgentLlmCallLogService;
import cn.boommanpro.gaia.workflow.infra.manage.service.AgentToolCallLogService;
import cn.hutool.json.JSONArray;
import cn.hutool.json.JSONObject;
import cn.hutool.json.JSONUtil;
import io.agentscope.core.agent.RuntimeContext;
import io.agentscope.core.event.AgentEventType;
import io.agentscope.core.event.AgentResultEvent;
import io.agentscope.core.event.ExceedMaxItersEvent;
import io.agentscope.core.event.ModelCallEndEvent;
import io.agentscope.core.event.TextBlockDeltaEvent;
import io.agentscope.core.event.ThinkingBlockDeltaEvent;
import io.agentscope.core.message.Msg;
import io.agentscope.core.message.MsgRole;
import io.agentscope.core.message.TextBlock;
import io.agentscope.core.message.ToolResultMessage;
import io.agentscope.core.message.ToolUseBlock;
import io.agentscope.core.model.ExecutionConfig;
import io.agentscope.core.tool.ToolBase;
import io.agentscope.core.tool.ToolCallParam;
import io.agentscope.core.tool.Toolkit;
import io.agentscope.extensions.model.openai.OpenAIChatModel;
import io.agentscope.harness.agent.memory.compaction.CompactionConfig;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicLong;
import java.util.concurrent.atomic.AtomicReference;

/**
 * AgentScope Java 2.0 执行引擎 —— 推理循环内核换核（对标 dsh 的 harness 形态）。
 *
 * <p>职责切分：</p>
 * <ul>
 *   <li><b>AgentScope 负责</b>：ReAct 推理循环、自然停止、流式事件、轮次护栏
 *       （ExceedMaxIters）、模型调用重试 —— 这些不再自研维护。</li>
 *   <li><b>自研保留</b>（资产不重写）：13 个工具执行器 +
 *       会话草稿服务 + 消息持久化 + 工具调用指标 —— 通过
 *       {@link AgentScopeToolAdapter} 注入 AgentScope Toolkit。</li>
 * </ul>
 *
 * <p>会话真相仍在自研 {@code agent_message} 表：每次 run 把全量历史映射成
 * AgentScope {@code Msg} 列表（无状态直通），AgentScope 侧使用一次性
 * sessionId，不在其 state store 里留第二份会话 —— 避免双写漂移。</p>
 */
@Slf4j
@Component
@Order(1)
public class AgentScopeExecutionEngine implements AgentExecutionEngine {

    public static final String ENGINE_ID = "agentscope";

    /**
     * 轮次硬兜底 = wrap-up 触顶 + 收尾富余：runawayTurnCeiling（默认 30）触发
     * 收尾后，模型还需要 1-2 轮正文总结；ExceedMaxIters 只在收尾都失败时兜底。
     */
    private static final int WRAP_UP_HEADROOM = 8;

    private static final Duration STREAM_TIMEOUT = Duration.ofMinutes(10);

    /** 历史确定性剪枝：超过此条数保留最近 {@code HISTORY_KEEP} 条（溢出压缩前的第一道闸） */
    private static final int HISTORY_PRUNE_THRESHOLD = 40;
    private static final int HISTORY_KEEP = 30;

    private final AgentRegistry agentRegistry;
    private final ToolExecutorRegistry toolExecutorRegistry;
    private final AgentToolRegistry toolSchemaRegistry;
    private final SystemPromptResolver systemPromptResolver;
    private final ConversationStore conversationStore;
    private final AgentModelConfigService modelConfigService;
    private final AgentToolCallLogService toolCallLogService;
    private final AgentLlmCallLogService llmCallLogService;
    private final AgentProperties properties;

    public AgentScopeExecutionEngine(AgentRegistry agentRegistry,
                                     ToolExecutorRegistry toolExecutorRegistry,
                                     AgentToolRegistry toolSchemaRegistry,
                                     SystemPromptResolver systemPromptResolver,
                                     ConversationStore conversationStore,
                                     AgentModelConfigService modelConfigService,
                                     AgentToolCallLogService toolCallLogService,
                                     AgentLlmCallLogService llmCallLogService,
                                     AgentProperties properties) {
        this.agentRegistry = agentRegistry;
        this.toolExecutorRegistry = toolExecutorRegistry;
        this.toolSchemaRegistry = toolSchemaRegistry;
        this.systemPromptResolver = systemPromptResolver;
        this.conversationStore = conversationStore;
        this.modelConfigService = modelConfigService;
        this.toolCallLogService = toolCallLogService;
        this.llmCallLogService = llmCallLogService;
        this.properties = properties;
    }

    @Override
    public String id() {
        return ENGINE_ID;
    }

    /**
     * 认领默认档：engine 为空或 agentscope 都走本引擎（强制换核后的新默认）。
     * 旧自研循环仅在显式 engine=local 时启用（回滚通道）。
     */
    @Override
    public boolean supports(AgentDefinition definition) {
        String engine = definition == null ? null : definition.getEngine();
        return ENGINE_ID.equalsIgnoreCase(engine == null || engine.isEmpty() ? ENGINE_ID : engine);
    }

    @Override
    public AgentRunResult run(AgentRequest request, AgentEventSink sink) {
        AgentEventSink safeSink = sink != null ? sink : AgentEventSink.noop();

        Optional<Agent> routed = agentRegistry.route(request);
        if (!routed.isPresent()) {
            String message = "没有可用的 Agent（" + agentRegistry.size() + " 个已注册候选均不匹配）";
            safeSink.emit(AgentEvent.of("error", new JSONObject().set("message", message)));
            return AgentRunResult.failure(message);
        }
        AgentDefinition definition = routed.get().getDefinition();

        if (request.getSessionKey() == null || request.getSessionKey().isEmpty()) {
            request.setSessionKey(conversationStore.newSessionKey());
        }
        String sessionKey = request.getSessionKey();
        AgentRunContext context = new AgentRunContext(request, definition,
            cn.boommanpro.gaia.workflow.app.agent.core.ToolExecutionMode.BACKEND);
        context.setSink(safeSink);

        AgentModelConfigService.LlmConfig cfg = modelConfigService.getLlmConfig();

        // ---- 系统提示词：按 Agent 定义解析（definition.systemPrompt > configKey > 默认） ----
        // 默认提示词由 AgentToolRegistry 组装（DB 正文 + 按启用状态动态渲染的工具目录）。
        // pageContext 不再拼进 system prompt：作为 user 快照消息注入（见 streamRun）。
        String systemPrompt = systemPromptResolver.resolve(definition,
            context.getLocale() != null ? context.getLocale() : "zh-CN");

        // ---- 模型：OpenAI 兼容端点直连（本地 Qwen / vLLM / 任何 /v1）；
        //      agent.llm.scripted=true 时内层换脚本化 mock 模型（测试验收零 LLM 依赖） ----
        io.agentscope.core.model.Model innerModel;
        if (properties.getLlm().isScripted()) {
            log.info("[agentscope-engine] session={} using scripted mock model ({})",
                sessionKey, properties.getLlm().getScriptedResource());
            innerModel = cn.boommanpro.gaia.workflow.app.agent.llm.ScriptedChatModel.fromResource(
                properties.getLlm().getScriptedResource());
        } else {
            innerModel = OpenAIChatModel.builder()
                .baseUrl(cfg.getApiHost())
                .apiKey(cfg.getApiKey())
                .modelName(cfg.getModel())
                .contextWindowSize(cfg.getContextWindow())
                .generateOptions(io.agentscope.core.model.GenerateOptions.builder()
                    .temperature(definition.getTemperature() != null ? definition.getTemperature() : cfg.getTemperature())
                    .maxTokens(cfg.getMaxTokens())
                    .build())
                .build();
        }

        // ---- generation 级埋点：每次模型调用记 agent_llm_call_log（失败/空响应根因探索的数据底座） ----
        RecordingModel recordingModel = new RecordingModel(innerModel,
            rec -> persistLlmCall(sessionKey, request.getRunId(), rec));

        // ---- 工具：13 个自研执行器经适配器进 Toolkit（门禁/指标/落库管道闭包注入） ----
        RepeatToolGuard repeatGuard = new RepeatToolGuard();
        WrapUpGuard wrapUpGuard = new WrapUpGuard(
            properties.getRun().getRunawayTurnCeiling(), properties.getRun().getNoProgressTurnLimit());
        // 本次 run 的全部工具调用（含失败）：随 assistant 消息回写 agent_message.tool_calls。
        // 缺了它，历史回放只剩孤儿 tool 结果（没有前驱 tool_use），模型看不见自己上一轮
        // 怎么调的、前端刷新后工具卡全部消失——2026-10-10 edit_workflow 31 连败的总根子。
        List<LlmToolCall> executedToolCalls = java.util.Collections.synchronizedList(new ArrayList<>());
        RunStats stats = new RunStats();
        long runStartedAt = System.currentTimeMillis();
        Toolkit toolkit = buildToolkit(definition, context, safeSink, repeatGuard, wrapUpGuard,
            executedToolCalls, stats);

        log.info("[agentscope-engine] session={} agent={} model={} tools={}",
            sessionKey, definition.getId(), cfg.getModel(), toolkit.getToolNames().size());

        try {
            // agent 构造下沉到 streamRun：空响应重试每次需要全新 HarnessAgent 实例
            return streamRun(definition, systemPrompt, cfg, recordingModel, toolkit, context, safeSink,
                sessionKey, wrapUpGuard, executedToolCalls, stats, runStartedAt);
        } catch (Exception e) {
            log.error("[agentscope-engine] session={} run failed: {}", sessionKey, e.getMessage(), e);
            safeSink.emit(AgentEvent.of("error", new JSONObject().set("message", "运行异常：" + e.getMessage())));
            AgentRunResult failure = AgentRunResult.failure("AgentScope 运行异常：" + e.getMessage());
            failure.setEngine(ENGINE_ID);
            failure.setDurationMs(System.currentTimeMillis() - runStartedAt);
            failure.setToolTimeMs(stats.mergedToolMs());
            failure.setFailureChain(new ArrayList<>(List.of("engine_error")));
            return failure;
        }
    }

    /** LLM 调用账本落库（best-effort：任何异常只打 debug，不影响主链路） */
    private void persistLlmCall(String sessionKey, String runId, RecordingModel.LlmCallRecord rec) {
        if (llmCallLogService == null) {
            return;
        }
        try {
            AgentLlmCallLog row = new AgentLlmCallLog();
            row.setSessionKey(sessionKey);
            row.setRunId(runId);
            row.setSeq(rec.seq);
            row.setModel(rec.model);
            row.setMessagesCount(rec.messagesCount);
            row.setToolsCount(rec.toolsCount);
            row.setPromptDigest(rec.promptDigest);
            row.setOutputDigest(rec.outputDigest);
            row.setPromptTokens(rec.promptTokens);
            row.setCompletionTokens(rec.completionTokens);
            row.setCachedTokens(rec.cachedTokens);
            row.setDurationMs(rec.durationMs);
            row.setStatus(rec.status);
            row.setErrorMessage(rec.errorMessage);
            row.setCreatedAt(LocalDateTime.now().toString());
            llmCallLogService.save(row);
        } catch (Exception e) {
            log.debug("[agentscope-engine] llm call log persist failed: {}", e.getMessage());
        }
    }

    /**
     * HarnessAgent 装配。权限上下文设 BYPASS：工具不做权限管控（全量放行），
     * 语义校验（schema/DSL/CAS）仍在各工具执行器内完成。
     *
     * <p>压缩对齐：triggerTokens 按 Qwen 上下文窗 80% 显式设置（框架默认阈值与
     * 实际窗口无关）；模型重试显式 5 次+指数退避（框架默认 2 次对瞬时故障太薄，
     * steer4 会话实锤 Retries exhausted）。</p>
     */
    private io.agentscope.harness.agent.HarnessAgent buildAgent(AgentDefinition definition,
                                                                String systemPrompt,
                                                                AgentModelConfigService.LlmConfig cfg,
                                                                RecordingModel model,
                                                                Toolkit toolkit) {
        int contextWindow = cfg.getContextWindow() > 0 ? cfg.getContextWindow() : 32768;
        io.agentscope.harness.agent.HarnessAgent agent = io.agentscope.harness.agent.HarnessAgent.builder()
            .name(definition.getId())
            .agentId(definition.getId())
            .description(definition.getDescription())
            .sysPrompt(systemPrompt)
            .model(model)
            .toolkit(toolkit)
            .maxIters(properties.getRun().getRunawayTurnCeiling() + WRAP_UP_HEADROOM)
            .permissionContext(io.agentscope.core.permission.PermissionContextState.builder()
                .mode(io.agentscope.core.permission.PermissionMode.BYPASS)
                .build())
            .compaction(CompactionConfig.builder()
                .triggerTokens((int) (contextWindow * 0.8))
                .keepTokens(contextWindow / 5)
                .keepMessages(HISTORY_KEEP)
                .build())
            .modelExecutionConfig(ExecutionConfig.builder()
                .maxAttempts(5)
                .initialBackoff(Duration.ofMillis(500))
                .maxBackoff(Duration.ofSeconds(10))
                .backoffMultiplier(2.0)
                .timeout(Duration.ofMinutes(5))
                .retryOn(ExecutionConfig.RETRYABLE_ERRORS)
                .build())
            .build();
        stripForeignTools(toolkit);
        return agent;
    }

    /**
     * 剔除 harness build() 默认注入的非自研工具（字节码证实：web_fetch/web_search 无条件注册，
     * memory_search/get/save、session_search、filesystem_tool、wait_async_results 注册但无后端 ——
     * 调用即败）。对弱模型是 schema 噪声，对部署是意外出网面。只保留 gaia 自己注册的 13 工具。
     */
    private static void stripForeignTools(Toolkit toolkit) {
        try {
            Set<String> removed = new HashSet<>();
            for (String name : new HashSet<>(toolkit.getToolNames())) {
                // 自研工具名是 snake_case 业务名；框架注入的休眠工具统一在此黑名单
                if (FOREIGN_TOOL_NAMES.contains(name)) {
                    toolkit.removeTool(name);
                    removed.add(name);
                }
            }
            if (!removed.isEmpty()) {
                log.info("[agentscope-engine] stripped harness default tools: {}", removed);
            }
        } catch (Exception e) {
            log.debug("[agentscope-engine] strip foreign tools failed (ignored): {}", e.getMessage());
        }
    }

    /** harness 默认注入、gaia 不需要也不提供的工具名（后端无文件树/沙箱/记忆库/MCP 总线） */
    private static final Set<String> FOREIGN_TOOL_NAMES = Set.of(
        "web_fetch", "web_search", "webFetch", "webSearch",
        "memory_search", "memory_get", "memory_save", "session_search",
        "filesystem", "filesystem_tool", "wait_async_results");

    /** 空响应重试上限（弱模型实测会回 1 个 token 的空转，重跑通常即恢复） */
    private static final int EMPTY_RESPONSE_MAX_RETRIES = 2;

    /**
     * 单次 run 的观测累计：模型调用数/工具耗时区间/token/失败链。
     * 全部数据随 run_end 事件与 AgentRunResult 外发 —— 失败归因卡与时间账小结卡的数据源。
     */
    private static final class RunStats {
        final AtomicInteger modelCalls = new AtomicInteger();
        /** {toolName, startMs, endMs} —— 并发工具的耗时按区间重叠合并统计 */
        final List<Object[]> toolIntervals = java.util.Collections.synchronizedList(new ArrayList<>());
        final AtomicLong promptTokens = new AtomicLong();
        final AtomicLong completionTokens = new AtomicLong();
        final List<String> failureChain = java.util.Collections.synchronizedList(new ArrayList<>());
        volatile int llmRetries;

        void addToolInterval(String name, long startMs, long endMs) {
            toolIntervals.add(new Object[]{name, startMs, endMs});
        }

        /** 工具耗时合计（并发区间重叠合并，OWB 时间账同款算法） */
        long mergedToolMs() {
            List<long[]> intervals = new ArrayList<>();
            synchronized (toolIntervals) {
                for (Object[] entry : toolIntervals) {
                    intervals.add(new long[]{(Long) entry[1], (Long) entry[2]});
                }
            }
            intervals.sort((a, b) -> Long.compare(a[0], b[0]));
            long total = 0;
            long currentEnd = Long.MIN_VALUE;
            for (long[] interval : intervals) {
                long start = Math.max(interval[0], currentEnd);
                if (interval[1] > start) {
                    total += interval[1] - start;
                    currentEnd = interval[1];
                }
            }
            return total;
        }

        int toolCallCount() {
            synchronized (toolIntervals) {
                return toolIntervals.size();
            }
        }

        JSONArray slowestTools(int limit) {
            JSONArray array = new JSONArray();
            synchronized (toolIntervals) {
                List<Object[]> sorted = new ArrayList<>(toolIntervals);
                sorted.sort((a, b) -> Long.compare((Long) b[2] - (Long) b[1], (Long) a[2] - (Long) a[1]));
                for (int i = 0; i < Math.min(limit, sorted.size()); i++) {
                    Object[] entry = sorted.get(i);
                    array.add(new JSONObject()
                        .set("name", entry[0])
                        .set("durationMs", (Long) entry[2] - (Long) entry[1]));
                }
            }
            return array;
        }

        JSONArray chainJson() {
            JSONArray array = new JSONArray();
            synchronized (failureChain) {
                for (String item : failureChain) {
                    array.add(item);
                }
            }
            return array;
        }

        /** 时间账小结（run_end / assistant_settled 载荷） */
        JSONObject timingJson(long runDurationMs) {
            return new JSONObject()
                .set("durationMs", runDurationMs)
                .set("toolMs", mergedToolMs())
                .set("toolCalls", toolCallCount())
                .set("modelCalls", modelCalls.get())
                .set("slowestTools", slowestTools(3));
        }
    }

    /**
     * 流式执行：AgentScope 事件流 → 自研 SSE 协议（前端零改动）。
     *
     * <p>韧性补丁（活体实测发现）：run 启动前先排空 steering 收件箱；终稿为空
     * （模型没说话也没被中断/触顶）时按有界次数换新 HarnessAgent 重跑 ——
     * durable-before-wait：先落 llm_retry 事件再等待。</p>
     */
    private AgentRunResult streamRun(AgentDefinition definition, String systemPrompt,
                                     AgentModelConfigService.LlmConfig cfg, RecordingModel model,
                                     Toolkit toolkit, AgentRunContext context, AgentEventSink sink,
                                     String sessionKey, WrapUpGuard wrapUpGuard,
                                     List<LlmToolCall> executedToolCalls,
                                     RunStats stats, long runStartedAt) {
        List<Msg> msgs = buildMessages(context, sessionKey, sink, stats);
        insertPageContextSnapshot(context, msgs);
        drainSteeringInto(context, sink, msgs);
        // AGENT_RESULT 回显守卫的历史侧基线：与历史 assistant 逐字相同的「结果」不是终稿
        Set<String> historyAssistantTexts = collectAssistantTexts(msgs);

        for (int attempt = 1; ; attempt++) {
            io.agentscope.harness.agent.HarnessAgent agent =
                buildAgent(definition, systemPrompt, cfg, model, toolkit);
            try (agent) {
                sink.emit(AgentEvent.of("turn", new JSONObject().set("turn", 1).set("engine", ENGINE_ID)));
                sink.emit(AgentEvent.of("llm_request", new JSONObject()
                    .set("turn", 1).set("messageCount", msgs.size()).set("engine", ENGINE_ID)));

                StringBuilder finalContent = new StringBuilder();
                StringBuilder thinking = new StringBuilder();
                AtomicReference<String> lastModel = new AtomicReference<>();
                AtomicBoolean exceeded = new AtomicBoolean(false);

                RuntimeContext ctx = RuntimeContext.builder()
                    .userId("gaia")
                    .sessionId(sessionKey + ":" + (context.getRequest().getRunId() != null
                        ? context.getRequest().getRunId() : Long.toHexString(System.currentTimeMillis()))
                        + ":" + attempt)
                    .build();

                agent.streamEvents(msgs, ctx)
                    .takeWhile(ev -> !context.isInterrupted() && !context.isSoftStopRequested())
                    .doOnNext(ev -> translateEvent(ev, sink, finalContent, thinking, lastModel,
                        exceeded, stats, wrapUpGuard, historyAssistantTexts))
                    .collectList()
                    .block(STREAM_TIMEOUT);

                String toolCallsJson = toToolCallsJson(executedToolCalls);

                boolean interrupted = context.isInterrupted();
                if (interrupted) {
                    stats.failureChain.add("user_interrupt");
                    // 已流出的部分正文必须随中断 marker 一起落库 —— 否则刷新后用户
                    // 看到过的正文从 DB 视图消失且无事件再触发重载（刷新一致性症状之一）
                    String persisted = persistInterruptedRun(conversationStore, sessionKey,
                        finalContent.toString(),
                        thinking.length() > 0 ? thinking.toString() : null, toolCallsJson);
                    sink.emit(AgentEvent.of("interrupted", new JSONObject()));
                    return finishedResult(persisted, definition, sessionKey, stats, runStartedAt, true, false);
                }

                // 护栏软停（复读硬熔断）：合成收尾消息落库，模型不再获得发言权。
                // 收尾文案已由护栏写进最后一条工具结果，这里固化成 assistant 消息，
                // 保证下一轮模型与前端刷新都能看到"为什么停"。
                if (context.isSoftStopRequested()) {
                    stats.failureChain.add("repeat_guard_hard_stop");
                    String closing = context.getSoftStopReason();
                    conversationStore.saveMessage(sessionKey, "assistant", closing, toolCallsJson, null,
                        thinking.length() > 0 ? thinking.toString() : null);
                    sink.emit(AgentEvent.of("wrap_up", new JSONObject()
                        .set("reason", "repeat_guard")
                        .set("message", closing)));
                    emitSettled(sink, stats, closing, thinking, executedToolCalls);
                    return finishedResult(closing, definition, sessionKey, stats, runStartedAt, false, false);
                }

                String content = finalContent.toString();
                if (exceeded.get()) {
                    stats.failureChain.add("exceeded_max_iters");
                    content = (content.isEmpty() ? "" : content + "\n\n")
                        + "已达单次运行轮次上限，本次执行自动收束。请继续对话以推进剩余步骤。";
                }
                if (wrapUpGuard.isWrappedUp()) {
                    stats.failureChain.add("wrap_up_advisory");
                }

                // 空响应护栏：确实调过模型、没被中断、没触顶，但一个字都没产出 → 重跑
                if (content.trim().isEmpty() && stats.modelCalls.get() > 0 && attempt <= EMPTY_RESPONSE_MAX_RETRIES) {
                    stats.llmRetries++;
                    if (!stats.failureChain.contains("empty_response")) {
                        stats.failureChain.add("empty_response");
                    }
                    sink.emit(AgentEvent.of("llm_retry", new JSONObject()
                        .set("attempt", attempt)
                        .set("code", "EMPTY_RESPONSE")
                        .set("delayMs", 500)
                        .set("engine", ENGINE_ID)));
                    log.warn("[agentscope-engine] session={} empty response on attempt {}, retrying",
                        sessionKey, attempt);
                    if (!sleepInterruptible(500, context)) {
                        stats.failureChain.add("user_interrupt");
                        String persisted = persistInterruptedRun(conversationStore, sessionKey,
                            finalContent.toString(),
                            thinking.length() > 0 ? thinking.toString() : null, toolCallsJson);
                        sink.emit(AgentEvent.of("interrupted", new JSONObject()));
                        return finishedResult(persisted, definition, sessionKey, stats, runStartedAt, true, false);
                    }
                    continue;
                }

                if (!content.trim().isEmpty()) {
                    // assistant 消息必须带 toolCalls 回写：下一轮历史回放才有合法的
                    // tool_use → tool_result 交错，前端刷新后工具卡才重建得出来
                    conversationStore.saveMessage(sessionKey, "assistant", content, toolCallsJson, null,
                        thinking.length() > 0 ? thinking.toString() : null);
                } else if (stats.modelCalls.get() > 0) {
                    // 重试预算也烧完仍是空响应：如实记入失败链，不许静默当成功
                    stats.failureChain.add("empty_response_unrecovered");
                }
                emitSettled(sink, stats, content, thinking, executedToolCalls);
                return finishedResult(content, definition, sessionKey, stats, runStartedAt, false, exceeded.get());
            }
        }
    }

    /** 统一收口：填充观测字段（引擎/耗时/token/失败链/最慢工具）的 AgentRunResult */
    private AgentRunResult finishedResult(String content, AgentDefinition definition, String sessionKey,
                                          RunStats stats, long runStartedAt, boolean interrupted,
                                          boolean abortedByTurnLimit) {
        AgentRunResult result = AgentRunResult.success(content, definition.getId(), sessionKey,
            stats.modelCalls.get());
        result.setEngine(ENGINE_ID);
        result.setDurationMs(System.currentTimeMillis() - runStartedAt);
        result.setToolTimeMs(stats.mergedToolMs());
        result.setPromptTokens((int) Math.min(stats.promptTokens.get(), Integer.MAX_VALUE));
        result.setCompletionTokens((int) Math.min(stats.completionTokens.get(), Integer.MAX_VALUE));
        result.setLlmRetries(stats.llmRetries);
        result.setInterrupted(interrupted);
        result.setAbortedByTurnLimit(abortedByTurnLimit);
        synchronized (stats.failureChain) {
            result.setFailureChain(new ArrayList<>(stats.failureChain));
        }
        return result;
    }

    /** assistant_settled 事件：携带 toolCalls 供前端在 run 收尾时合并渲染 */
    private static void emitSettled(AgentEventSink sink, RunStats stats, String content,
                                    StringBuilder thinking, List<LlmToolCall> executedToolCalls) {
        JSONArray calls = new JSONArray();
        synchronized (executedToolCalls) {
            for (LlmToolCall call : executedToolCalls) {
                calls.add(new JSONObject()
                    .set("id", call.getId())
                    .set("name", call.getName())
                    .set("arguments", call.getArguments()));
            }
        }
        sink.emit(AgentEvent.of("assistant_settled", new JSONObject()
            .set("turn", stats.modelCalls.get())
            .set("content", content)
            .set("thinkingLength", thinking.length())
            .set("promptTokens", stats.promptTokens.get())
            .set("completionTokens", stats.completionTokens.get())
            .set("toolCalls", calls)));
    }

    /** 工具调用列表 → agent_message.tool_calls 的 JSON 形态（与 Ark 引擎一致，OpenAI function 格式） */
    /**
     * 中断收尾落库：已流出的部分正文必须随中断 marker 一起持久化。
     * 包级可见 —— 中断落库契约有专项单测守护（AgentScopeInterruptedPersistTest）。
     *
     * @return 实际持久化的文本（部分正文 + marker，或仅 marker）
     */
    static String persistInterruptedRun(ConversationStore store, String sessionKey,
                                        String partialContent, String thinking, String toolCallsJson) {
        String partial = partialContent == null ? "" : partialContent.trim();
        String marker = "⏹ 本次运行已被中断。已完成的部分（草稿/已落版版本）保持有效。";
        if (partial.isEmpty()) {
            store.saveMessage(sessionKey, "assistant", marker, toolCallsJson, null);
            return marker;
        }
        String persisted = partial + "\n\n" + marker;
        store.saveMessage(sessionKey, "assistant", persisted, toolCallsJson, null, thinking);
        return persisted;
    }

    private static String toToolCallsJson(List<LlmToolCall> calls) {
        if (calls.isEmpty()) {
            return null;
        }
        JSONArray array = new JSONArray();
        synchronized (calls) {
            for (LlmToolCall call : calls) {
                array.add(new JSONObject()
                    .set("id", call.getId())
                    .set("type", "function")
                    .set("function", new JSONObject()
                        .set("name", call.getName())
                        .set("arguments", call.getArguments())));
            }
        }
        return array.toString();
    }

    /**
     * 页面上下文快照（dsh runtime-context 模式）：以 user 消息形态注入在本次
     * 用户消息之前，而不是拼在 system prompt 尾巴上 —— system prompt 保持稳定，
     * 快照天然表达「取代更早快照」的语义。不落库（每次 run 现取现用）。
     */
    private static void insertPageContextSnapshot(AgentRunContext context, List<Msg> msgs) {
        String pageContext = context.getPageContext();
        if (pageContext == null || pageContext.isEmpty() || msgs.isEmpty()) {
            return;
        }
        String snapshot = "[页面上下文快照] 当前页面的路由与画布信息如下"
            + "（本快照取代更早的页面上下文信息，仅对理解用户意图有效）：\n```json\n"
            + pageContext + "\n```";
        // 找到本次 run 的用户消息（历史里最后一条 user），快照插在它前面
        int at = msgs.size();
        for (int i = msgs.size() - 1; i >= 0; i--) {
            if (msgs.get(i).getRole() == MsgRole.USER) {
                at = i;
                break;
            }
        }
        msgs.add(at, Msg.builder().role(MsgRole.USER).textContent(snapshot).build());
    }

    /** run 启动前把 steering 收件箱里已到达的消息并入对话（持久化由 run 侧完成） */
    private void drainSteeringInto(AgentRunContext context, AgentEventSink sink, List<Msg> msgs) {
        cn.boommanpro.gaia.workflow.app.agent.core.SteeringInbox inbox = context.getSteeringInbox();
        if (inbox == null || inbox.isEmpty()) {
            return;
        }
        for (cn.boommanpro.gaia.workflow.app.agent.core.SteeringInbox.Message m : inbox.drain()) {
            msgs.add(Msg.builder().role(MsgRole.USER).textContent(safeText(m.content)).build());
            sink.emit(AgentEvent.of("user_message", new JSONObject()
                .set("content", m.content).set("steering", true)));
        }
    }

    /** 分片睡眠：期间被中断立即返回 false */
    private static boolean sleepInterruptible(long delayMs, AgentRunContext context) {
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

    /** AgentScope 细粒度事件 → 现有前端 SSE 协议 */
    private void translateEvent(io.agentscope.core.event.AgentEvent event, AgentEventSink sink,
                                StringBuilder finalContent, StringBuilder thinking,
                                AtomicReference<String> lastModel, AtomicBoolean exceeded,
                                RunStats stats, WrapUpGuard wrapUpGuard, Set<String> historyAssistantTexts) {
        AgentEventType type = event.getType();
        if (type == AgentEventType.TEXT_BLOCK_DELTA) {
            String delta = ((TextBlockDeltaEvent) event).getDelta();
            if (delta != null && !delta.isEmpty()) {
                finalContent.append(delta);
                sink.emit(AgentEvent.of("token", new JSONObject().set("content", delta)));
            }
        } else if (type == AgentEventType.THINKING_BLOCK_DELTA) {
            String delta = ((ThinkingBlockDeltaEvent) event).getDelta();
            if (delta != null && !delta.isEmpty()) {
                thinking.append(delta);
                sink.emit(AgentEvent.of("thinking", new JSONObject().set("content", delta)));
            }
        } else if (type == AgentEventType.MODEL_CALL_END) {
            stats.modelCalls.incrementAndGet();
            ModelCallEndEvent mce = (ModelCallEndEvent) event;
            if (mce.getUsage() != null) {
                if (mce.getUsage().getInputTokens() > 0) {
                    stats.promptTokens.addAndGet(mce.getUsage().getInputTokens());
                }
                if (mce.getUsage().getOutputTokens() > 0) {
                    stats.completionTokens.addAndGet(mce.getUsage().getOutputTokens());
                }
            }
            JSONObject meta = new JSONObject().set("turn", stats.modelCalls.get()).set("engine", ENGINE_ID);
            if (mce.getUsage() != null) {
                meta.set("promptTokens", mce.getUsage().getInputTokens())
                    .set("completionTokens", mce.getUsage().getOutputTokens());
            }
            sink.emit(AgentEvent.of("llm_end", meta));
            // 失控防护轮边界：结算上一轮无进展计数并推进轮次，触发即广播收尾指令
            boolean wasWrappedUp = wrapUpGuard.isWrappedUp();
            wrapUpGuard.onModelTurn();
            if (wrapUpGuard.isWrappedUp() && !wasWrappedUp) {
                log.warn("[agentscope-engine] wrap-up triggered: turns={} noProgressStreak={}",
                    wrapUpGuard.getTurns(), wrapUpGuard.getNoProgressStreak());
                sink.emit(AgentEvent.of("wrap_up", new JSONObject()
                    .set("turns", wrapUpGuard.getTurns())
                    .set("noProgressStreak", wrapUpGuard.getNoProgressStreak())
                    .set("message", wrapUpGuard.advisory())));
            }
        } else if (type == AgentEventType.EXCEED_MAX_ITERS) {
            exceeded.set(true);
        } else if (type == AgentEventType.AGENT_RESULT) {
            Msg result = ((AgentResultEvent) event).getResult();
            if (result != null && finalContent.length() == 0) {
                String text = extractText(result);
                // 回显守卫：结果与历史 assistant 消息逐字相同 = 框架把旧消息当了终稿
                // （空响应会被伪装成成功 + 重复落库）。只接受全新内容，其余交给空响应重试。
                if (text != null && !text.isEmpty() && !historyAssistantTexts.contains(text)) {
                    finalContent.append(text);
                }
            }
        }
    }

    /**
     * 自研历史（agent_message 表，真相源）→ AgentScope Msg 列表。
     * 确定性剪枝：超长历史只保留最近窗口（dsh context-economics 第一道闸；
     * run 内溢出由 HarnessAgent 内建 CompactionMiddleware 兜底，跨 run 摘要压缩
     * 由 SessionCompactionService 在 run 启动前触发）。
     * 包级可见：历史回放的正确性（tool_use/tool_result 配对）有专项单测守护。
     */
    List<Msg> buildMessages(AgentRunContext context, String sessionKey) {
        return buildMessages(context, sessionKey, null, null);
    }

    List<Msg> buildMessages(AgentRunContext context, String sessionKey, AgentEventSink sink, RunStats stats) {
        List<LlmMessage> history = conversationStore.loadHistory(sessionKey, 0);
        if (history.size() > HISTORY_PRUNE_THRESHOLD) {
            int before = history.size();
            int drop = before - HISTORY_KEEP;
            history = history.subList(drop, before);
            log.info("[agentscope-engine] session={} history pruned {} -> {} messages",
                sessionKey, before, HISTORY_KEEP);
            // 压缩可观测：剪枝必须让前端/事件日志看见，不能只进 log 文件
            if (sink != null) {
                sink.emit(AgentEvent.of("compaction", new JSONObject()
                    .set("kind", "prune")
                    .set("before", before)
                    .set("after", HISTORY_KEEP)
                    .set("dropped", drop)
                    .set("engine", ENGINE_ID)));
            }
        }
        List<Msg> msgs = new ArrayList<>();
        for (LlmMessage m : history) {
            String role = m.getRole();
            if ("user".equals(role)) {
                msgs.add(Msg.builder().role(MsgRole.USER).textContent(safeText(m.getContent())).build());
            } else if ("assistant".equals(role)) {
                List<io.agentscope.core.message.ContentBlock> blocks = new ArrayList<>();
                if (m.getContent() != null && !m.getContent().isEmpty()) {
                    blocks.add(TextBlock.builder().text(m.getContent()).build());
                }
                if (m.getToolCalls() != null) {
                    for (LlmToolCall call : m.getToolCalls()) {
                        blocks.add(new ToolUseBlock(call.getId(), call.getName(), parseInput(call.getArguments())));
                    }
                }
                if (!blocks.isEmpty()) {
                    msgs.add(Msg.builder().role(MsgRole.ASSISTANT).content(blocks).build());
                }
            } else if ("tool".equals(role) && m.getToolCallId() != null) {
                msgs.add(new ToolResultMessage(m.getToolCallId(), "tool",
                    safeText(m.getContent())));
            }
        }
        return msgs;
    }

    /** 历史 assistant 纯文本集合（AGENT_RESULT 回显守卫的比对基线） */
    private static Set<String> collectAssistantTexts(List<Msg> msgs) {
        Set<String> texts = new HashSet<>();
        for (Msg msg : msgs) {
            if (msg.getRole() == MsgRole.ASSISTANT) {
                String text = extractText(msg);
                if (text != null && !text.isEmpty()) {
                    texts.add(text);
                }
            }
        }
        return texts;
    }

    /** Toolkit 装配：定义声明的工具（空则全量）→ 适配器 + 完整执行管道 */
    private Toolkit buildToolkit(AgentDefinition definition, AgentRunContext context,
                                 AgentEventSink sink, RepeatToolGuard repeatGuard,
                                 WrapUpGuard wrapUpGuard, List<LlmToolCall> executedToolCalls,
                                 RunStats stats) {
        Toolkit toolkit = new Toolkit();
        List<AgentToolDefinition> definitions = toolSchemaRegistry.getToolDefinitions();
        for (AgentToolDefinition def : definitions) {
            if (!Integer.valueOf(1).equals(def.getEnabled())) {
                continue;
            }
            boolean wanted = definition.getToolNames() == null || definition.getToolNames().isEmpty()
                || definition.getToolNames().contains(def.getToolName());
            if (!wanted) {
                continue;
            }
            Optional<ToolExecutor> executor = toolExecutorRegistry.get(def.getToolName());
            if (!executor.isPresent()) {
                continue;
            }
            boolean readOnly = isReadOnlyTool(def);
            cn.hutool.json.JSONObject parameters = null;
            try {
                parameters = def.getParameters() != null ? JSONUtil.parseObj(def.getParameters()) : null;
            } catch (Exception e) {
                log.warn("[agentscope-engine] tool {} parameters parse failed: {}", def.getToolName(), e.getMessage());
            }
            toolkit.registerAgentTool(new AgentScopeToolAdapter(
                def.getToolName(), def.getDescription(), parameters, readOnly,
                (param, args) -> invokeTool(def.getToolName(), executor.get(), param, args,
                    context, sink, repeatGuard, wrapUpGuard, executedToolCalls, stats)));
        }
        return toolkit;
    }

    /**
     * 工具执行管道：schema 校验 → 执行 → 指标落库 → tool 消息落库 →
     * 事件外发 → 复读护栏。
     * 失控防护触发后入口直接拒绝（收走工具），指令模型正文收尾。
     */
    private ToolResult invokeTool(String toolName, ToolExecutor executor, ToolCallParam param,
                                  JSONObject args, AgentRunContext context, AgentEventSink sink,
                                  RepeatToolGuard repeatGuard, WrapUpGuard wrapUpGuard,
                                  List<LlmToolCall> executedToolCalls, RunStats stats) {
        long startedAt = System.currentTimeMillis();
        String callId = param.getToolUseBlock() != null ? param.getToolUseBlock().getId() : "";
        context.nextTurn();

        // 登记进本次 run 的调用清单（含失败调用）：assistant 落库与 assistant_settled 都用它
        LlmToolCall executedCall = new LlmToolCall();
        executedCall.setId(callId);
        executedCall.setName(toolName);
        executedCall.setArguments(args != null ? args.toString() : "{}");
        executedToolCalls.add(executedCall);

        if (wrapUpGuard.isWrappedUp()) {
            return ToolResult.rejected(wrapUpGuard.advisory());
        }
        wrapUpGuard.onToolCall();

        sink.emit(AgentEvent.of("tool_call", new JSONObject()
            .set("id", callId).set("name", toolName)
            .set("args", args).set("executedBy", "backend")));

        ToolResult result = null;
        // 1. schema 校验（dsh 执行前强校验，path 级修复指引）
        cn.hutool.json.JSONObject paramsSchema = toolSchemaRegistry.getToolParameters(toolName);
        if (paramsSchema != null) {
            List<ToolArgsValidator.Violation> violations = ToolArgsValidator.validate(paramsSchema, args);
            if (!violations.isEmpty()) {
                result = ToolResult.invalidArgs(violations, null);
            }
        }
        // 2. 执行（工具不做权限管控：语义校验与 CAS 基准在执行器内完成）
        if (result == null) {
            try {
                result = executor.execute(args, context);
            } catch (Exception e) {
                log.warn("[agentscope-engine] tool {} threw: {}", toolName, e.getMessage());
                result = ToolResult.fail("{\"error\":\"" + e.getMessage() + "\"}", "工具执行异常",
                    ToolErrorCode.EXEC_ERROR);
            }
        }

        // 3. tool 消息落库（会话真相源）
        try {
            conversationStore.saveMessage(context.getSessionKey(), "tool", result.getPayload(), null, callId);
        } catch (Exception e) {
            log.warn("[agentscope-engine] persist tool message failed: {}", e.getMessage());
        }

        // 5. 指标落库
        recordMetric(context, toolName, callId, result, args, startedAt);

        // 6. 事件外发（model-visible ⟺ logged）
        sink.emit(AgentEvent.of("tool_result", new JSONObject()
            .set("toolCallId", callId)
            .set("name", toolName)
            .set("outcome", outcomeOf(result))
            .set("errorCode", result.getErrorCode() != null ? result.getErrorCode().name() : null)
            .set("message", result.getMessage())
            .set("payload", safePreview(result.getPayload()))));

        // 7. 失控防护进度记账：任一工具成功即本轮「有进展」
        wrapUpGuard.onToolResult(result.isSuccess());

        // 8. 复读护栏：同参数复读升级提醒；INVALID_ARGS 同参 3 次硬熔断（软停收尾）。
        //    提醒只附加进结果、不覆盖——violations 的 path/fix 是模型自修复的唯一线索。
        RepeatToolGuard.Verdict verdict = repeatGuard.record(
            toolName, args, result.isSuccess(), result.getErrorCode());
        if (verdict.action == RepeatToolGuard.Action.APPEND) {
            sink.emit(AgentEvent.of("repeat_reminder", new JSONObject().set("message", verdict.message)));
            result = appendGuardNote(result, verdict.message);
        } else if (verdict.action == RepeatToolGuard.Action.STOP) {
            sink.emit(AgentEvent.of("repeat_reminder", new JSONObject()
                .set("message", verdict.message).set("hardStop", true)));
            log.warn("[agentscope-engine] session={} repeat hard-stop on tool={} (identical INVALID_ARGS x{})",
                context.getSessionKey(), toolName, RepeatToolGuard.INVALID_ARGS_HARD_STOP_AT);
            context.requestSoftStop(verdict.message);
            stats.failureChain.add("repeat_guard_hard_stop:" + toolName);
            result = appendGuardNote(result, verdict.message);
        }
        // 9. 时间账记账（run 收尾的时间账小结卡数据源；并发区间在 RunStats 合并）
        stats.addToolInterval(toolName, startedAt, System.currentTimeMillis());
        return result;
    }

    /** 把护栏提醒附加进结果 payload（解析失败时退化为纯文本结果），模型可见、前端可渲染 */
    private static ToolResult appendGuardNote(ToolResult result, String note) {
        String payload = result.getPayload();
        try {
            JSONObject json = JSONUtil.parseObj(payload != null ? payload : "{}");
            json.set("guard", note);
            return new ToolResult(result.isSuccess(), json.toString(), result.isRejected(),
                result.getMessage(), result.getErrorCode());
        } catch (Exception e) {
            return new ToolResult(result.isSuccess(),
                (payload != null ? payload + "\n" : "") + note, result.isRejected(),
                result.getMessage(), result.getErrorCode());
        }
    }

    private void recordMetric(AgentRunContext context, String toolName, String callId,
                              ToolResult result, JSONObject args, long startedAt) {
        if (toolCallLogService == null) {
            return;
        }
        try {
            AgentToolCallLog row = new AgentToolCallLog();
            row.setSessionKey(context.getSessionKey());
            row.setRunId(context.getRequest().getRunId());
            row.setTurn(context.getTurn());
            row.setToolName(toolName);
            row.setOutcome(outcomeOf(result));
            row.setErrorCode(result.getErrorCode() != null ? result.getErrorCode().name() : null);
            row.setDurationMs(System.currentTimeMillis() - startedAt);
            String argsText = args != null ? args.toString() : "";
            row.setArgsDigest(argsText.length() > 2000 ? argsText.substring(0, 2000) + "…" : argsText);
            row.setCreatedAt(LocalDateTime.now().toString());
            toolCallLogService.save(row);
        } catch (Exception e) {
            log.debug("[agentscope-engine] metric persist failed (ignored): {}", e.getMessage());
        }
    }

    private static String outcomeOf(ToolResult result) {
        if (result.isSuccess()) {
            return "SUCCESS";
        }
        if (result.getErrorCode() != null) {
            return result.getErrorCode().name();
        }
        return "EXEC_ERROR";
    }

    private static boolean isReadOnlyTool(AgentToolDefinition def) {
        String name = def.getToolName();
        return name.startsWith("list_") || name.startsWith("read_") || name.startsWith("get_")
            || name.startsWith("search_") || "todo_write".equals(name);
    }

    private static String safeText(String s) {
        return s != null ? s : "";
    }

    private static String safePreview(String payload) {
        if (payload == null) {
            return "";
        }
        return payload.length() > 4000 ? payload.substring(0, 4000) + "…" : payload;
    }

    private static Map<String, Object> parseInput(String arguments) {
        if (arguments == null || arguments.isBlank()) {
            return new LinkedHashMap<>();
        }
        try {
            JSONObject parsed = JSONUtil.parseObj(arguments);
            Map<String, Object> input = new LinkedHashMap<>();
            for (String k : parsed.keySet()) {
                input.put(k, parsed.get(k));
            }
            return input;
        } catch (Exception e) {
            return new LinkedHashMap<>();
        }
    }

    private static String extractText(Msg msg) {
        if (msg == null || msg.getContent() == null) {
            return null;
        }
        StringBuilder sb = new StringBuilder();
        for (Object block : msg.getContent()) {
            if (block instanceof TextBlock) {
                sb.append(((TextBlock) block).getText());
            }
        }
        return sb.toString();
    }
}
