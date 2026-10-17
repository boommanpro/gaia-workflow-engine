package cn.boommanpro.gaia.workflow.app.agent.ass;

import cn.boommanpro.gaia.workflow.app.agent.core.Agent;
import cn.boommanpro.gaia.workflow.app.agent.core.AgentDefinition;
import cn.boommanpro.gaia.workflow.app.agent.core.AgentRegistry;
import cn.boommanpro.gaia.workflow.app.agent.core.AgentRequest;
import cn.boommanpro.gaia.workflow.app.agent.core.AgentRunContext;
import cn.boommanpro.gaia.workflow.app.agent.core.AgentRunResult;
import cn.boommanpro.gaia.workflow.app.agent.core.ConversationStore;
import cn.boommanpro.gaia.workflow.app.agent.core.ToolExecutionMode;
import cn.boommanpro.gaia.workflow.app.agent.engine.AgentExecutionEngine;
import cn.boommanpro.gaia.workflow.app.agent.event.AgentEvent;
import cn.boommanpro.gaia.workflow.app.agent.event.AgentEventSink;
import cn.boommanpro.gaia.workflow.app.agent.llm.LlmToolCall;
import cn.boommanpro.gaia.workflow.app.service.AgentProviderConfigService;
import cn.hutool.json.JSONArray;
import cn.hutool.json.JSONObject;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicReference;

/**
 * AgentScope Service（自托管）执行引擎 —— 把对话循环托管给本机部署的
 * AgentScope Service Managed Agents，本服务做四件事：
 *
 * <ul>
 *   <li>会话映射：本地 sessionKey ↔ Service agent-sessions UUID（{@link AgentServiceSessionService}）</li>
 *   <li>按会话同步托管 Agent：MCP URL 编入会话键（{@link AgentServiceProvisioningService}）</li>
 *   <li>事件翻译：Session API 事件 → Gaia 统一事件（{@link AgentServiceEventTranslator}）</li>
 *   <li>工具执行：数据面经 MCP 回连 {@link AgentServiceMcpController}，live 上下文经
 *       {@link AssToolContextBridge} 桥接（画布事件实时推前端）</li>
 * </ul>
 *
 * <p>运行时序（与 ark 引擎同构，先开流再提交 Turn）：</p>
 * <pre>
 *   路由 Agent → 校验 provider_config:as-service → 同步会话级托管 Agent
 *   → 确保（或创建）Service Session → 打开 SSE 事件流 → 注册工具上下文桥
 *   → 提交 Turn → 消费事件（turn.completed/failed 终态 + 轮询双保险）
 *   → 用户停止转发 cancel → 收尾落库
 * </pre>
 */
@Slf4j
@Component
@Order(3)
public class AgentServiceExecutionEngine implements AgentExecutionEngine {

    public static final String ENGINE_ID = "as-service";

    /** 单次运行兜底上限（Service 负责轮次控制，这里只防僵尸线程） */
    private static final long MAX_RUN_MILLIS = 30 * 60 * 1000L;
    /** 事件增量轮询间隔（1.5s 一拉；token 以批次粒度到达前端） */
    private static final long EVENT_POLL_MILLIS = 1500;
    /** Turn 终态轮询间隔（SSE 之外的兜底判定，与事件轮询共用循环） */
    private static final long STATUS_POLL_MILLIS = 3000;
    /**
     * 复读熔断阈值（对齐本地引擎护栏）：同名同参工具连续失败 N 次即取消本轮。
     * 托管侧 HarnessAgent 没有本地引擎的护栏中间件，弱模型实测会以相同参数
     * 反复撞同一个错误直到 MAX_ITERATIONS（2026-10-16 舆情分析任务实测连撞 12 次）。
     */
    private static final int REPEAT_FAILURE_LIMIT = 2;
    /** Turn 终态集合 */
    private static final Set<String> TERMINAL_STATUSES = Set.of(
        "completed", "partial_succeeded", "failed", "cancelled", "timed_out");

    private final AgentRegistry agentRegistry;
    private final AgentServiceClient client;
    private final AgentProviderConfigService providerConfigService;
    private final AgentServiceSessionService sessionService;
    private final AgentServiceProvisioningService provisioningService;
    private final ConversationStore conversationStore;
    private final cn.boommanpro.gaia.workflow.infra.manage.service.AgentLlmCallLogService llmCallLogService;

    public AgentServiceExecutionEngine(AgentRegistry agentRegistry,
                                       AgentServiceClient client,
                                       AgentProviderConfigService providerConfigService,
                                       AgentServiceSessionService sessionService,
                                       AgentServiceProvisioningService provisioningService,
                                       ConversationStore conversationStore,
                                       cn.boommanpro.gaia.workflow.infra.manage.service.AgentLlmCallLogService llmCallLogService) {
        this.agentRegistry = agentRegistry;
        this.client = client;
        this.providerConfigService = providerConfigService;
        this.sessionService = sessionService;
        this.provisioningService = provisioningService;
        this.conversationStore = conversationStore;
        this.llmCallLogService = llmCallLogService;
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
            safeSink.emit(AgentEvent.of("error", new JSONObject().set("message", message)));
            return AgentRunResult.failure(message);
        }
        AgentDefinition definition = routed.get().getDefinition();
        AgentProviderConfigService.AsServiceConfig cfg = providerConfigService.getAsServiceConfig();
        if (!sessionService.isAsServiceConfigured(cfg)) {
            String message = "AgentScope Service 未配置：请在配置中心填写 provider_config:as-service"
                + "（baseUrl / apiKey / agentId 或 adminPassword）";
            safeSink.emit(AgentEvent.of("error", new JSONObject().set("message", message)));
            return AgentRunResult.failure(message);
        }

        if (request.getSessionKey() == null || request.getSessionKey().isEmpty()) {
            request.setSessionKey(conversationStore.newSessionKey());
        }
        String sessionKey = request.getSessionKey();

        // 按会话同步托管 Agent（首次创建 / 提示词或工具变更时更新；无变更零调用）
        String remoteAgentId;
        try {
            AgentServiceProvisioningService.ProvisionedAgent provisioned =
                provisioningService.ensureSessionAgent(definition, sessionKey, request.getLocale());
            remoteAgentId = provisioned.getAgentId();
        } catch (Exception e) {
            String message = "AgentScope Service 托管 Agent 同步失败（会话 " + sessionKey + "）: " + e.getMessage();
            log.error("[ass-engine] {}", message, e);
            safeSink.emit(AgentEvent.of("error", new JSONObject().set("message", message)));
            return AgentRunResult.failure(message);
        }

        AgentRunContext context = new AgentRunContext(request, definition, ToolExecutionMode.BACKEND);
        context.setSink(safeSink);

        AssRun run = new AssRun(definition, context, cfg, safeSink, remoteAgentId, sessionKey);
        return run.execute();
    }

    // ---------------- 一次运行的状态封装 ----------------

    private final class AssRun {

        private final AgentDefinition definition;
        private final AgentRunContext context;
        private final AgentProviderConfigService.AsServiceConfig cfg;
        private final AgentEventSink sink;
        private final String remoteAgentId;
        private final String sessionKey;

        private volatile String remoteSessionId;
        private volatile String turnId;
        /** 事件增量游标（GET /events?after=...） */
        private volatile String eventCursor = "";

        private final AgentServiceEventTranslator translator = new AgentServiceEventTranslator();
        private final Set<String> seenEventIds = ConcurrentHashMap.newKeySet();
        private final CountDownLatch completion = new CountDownLatch(1);
        private final AtomicBoolean cancelSent = new AtomicBoolean(false);
        private final AtomicReference<String> endReason = new AtomicReference<>(null);
        /** 复读熔断：tool_call_id → 「工具名+参数」指纹 */
        private final ConcurrentHashMap<String, String> callFingerprints = new ConcurrentHashMap<>();
        private final AtomicReference<String> lastFailureFingerprint = new AtomicReference<>(null);
        private final java.util.concurrent.atomic.AtomicInteger consecutiveFailures =
            new java.util.concurrent.atomic.AtomicInteger(0);
        /** getTurn 轮询拿到的终态快照（优先于增量翻译作为最终正文） */
        private final AtomicReference<JSONObject> terminalTurn = new AtomicReference<>(null);

        AssRun(AgentDefinition definition, AgentRunContext context,
               AgentProviderConfigService.AsServiceConfig cfg, AgentEventSink sink,
               String remoteAgentId, String sessionKey) {
            this.definition = definition;
            this.context = context;
            this.cfg = cfg;
            this.sink = sink;
            this.remoteAgentId = remoteAgentId;
            this.sessionKey = sessionKey;
        }

        AgentRunResult execute() {
            boolean bridged = false;
            try {
                remoteSessionId = sessionService.ensureRemoteSession(sessionKey, remoteAgentId,
                    () -> client.createSession(cfg, remoteAgentId,
                            AgentServiceClient.idempotencyKey("gaia-sess", sessionKey)).getStr("id"));
                log.info("[ass-engine] session={} → Service Session {} 启动运行 (agent={})",
                    sessionKey, remoteSessionId, remoteAgentId);

                // 记录提交前游标：事件轮询只拉本次 Turn 之后的部分
                eventCursor = currentCursor();
                // 工具经 MCP 回连本服务：live 上下文注册后画布事件可实时推前端
                AssToolContextBridge.register(sessionKey, context);
                bridged = true;
                submitTurn();
                awaitCompletion();
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                endReason.compareAndSet(null, "error:interrupted");
            } catch (Exception e) {
                log.error("[ass-engine] session={} 运行异常: {}", sessionKey, e.getMessage(), e);
                endReason.compareAndSet(null, "error:" + e.getMessage());
            } finally {
                if (bridged) {
                    AssToolContextBridge.unregister(sessionKey, context);
                }
            }
            return finalizeRun();
        }

        // ---------------- 阶段一：事件游标 ----------------

        /** 读取当前事件游标（提交 Turn 前调用，之后只拉增量） */
        private String currentCursor() {
            try {
                JSONObject page = client.getEvents(cfg, remoteSessionId, null);
                return page.getStr("next_cursor", "");
            } catch (Exception e) {
                log.warn("[ass-engine] session={} 读取事件游标失败（从全量开始）: {}", sessionKey, e.getMessage());
                return "";
            }
        }

        // ---------------- 阶段二：提交 Turn ----------------

        private void submitTurn() {
            String message = context.getUserMessage();
            if (context.getPageContext() != null && !context.getPageContext().isEmpty()) {
                message = message + "\n\n[页面上下文快照] 当前页面的路由与画布信息如下"
                    + "（本快照取代更早的页面上下文信息，仅对理解用户意图有效）：\n```json\n"
                    + context.getPageContext() + "\n```";
            }
            JSONObject accepted = client.submitTurn(cfg, remoteSessionId, message,
                AgentServiceClient.idempotencyKey("gaia-turn", sessionKey + ":" + context.getUserMessage()));
            String id = accepted.getStr("id", accepted.getStr("turnId"));
            if (id == null || id.isEmpty()) {
                throw new IllegalStateException("Turn 受理回执缺少 id: " + accepted);
            }
            turnId = id;
            log.debug("[ass-engine] session={} turn={} 已受理", sessionKey, turnId);
        }

        // ---------------- 阶段三：事件轮询循环 ----------------

        /**
         * 主等待循环：1.5s 拉事件增量（翻译并广播，token 批次粒度到达前端），
         * 3s 轮询 Turn 终态兜底；用户停止时转发取消。
         */
        private void awaitCompletion() throws InterruptedException {
            long deadline = System.currentTimeMillis() + MAX_RUN_MILLIS;
            long lastEventPoll = 0;
            long lastStatusPoll = 0;
            while (true) {
                long now = System.currentTimeMillis();
                if (now - lastEventPoll >= EVENT_POLL_MILLIS) {
                    lastEventPoll = now;
                    drainEvents();
                }
                if (now - lastStatusPoll >= STATUS_POLL_MILLIS) {
                    lastStatusPoll = now;
                    if (pollTurnStatus()) {
                        drainEvents();
                        return;
                    }
                }
                if (completion.await(300, TimeUnit.MILLISECONDS)) {
                    drainEvents();
                    return;
                }
                now = System.currentTimeMillis();
                if (!sink.isActive() && cancelSent.compareAndSet(false, true)) {
                    // 用户已停止：转发取消，短暂等待后收尾
                    log.info("[ass-engine] session={} 用户停止，取消 Turn {}", sessionKey, turnId);
                    if (turnId != null) {
                        client.cancelTurn(cfg, remoteSessionId, turnId);
                    }
                    endReason.compareAndSet(null, "cancelled");
                    completion.await(10, TimeUnit.SECONDS);
                    drainEvents();
                    return;
                }
                if (now > deadline) {
                    log.warn("[ass-engine] session={} 运行超过兜底上限 {} 分钟，强制收尾",
                        sessionKey, MAX_RUN_MILLIS / 60000);
                    endReason.compareAndSet(null, "error:运行超时");
                    return;
                }
            }
        }

        /** 拉取事件增量并逐条处理（去重 → 终态/控制事件直处理 → 其余翻译后广播） */
        private void drainEvents() {
            for (int round = 0; round < 20; round++) { // 单次最多 20 页，防失控
                JSONObject page;
                try {
                    page = client.getEvents(cfg, remoteSessionId, eventCursor);
                } catch (Exception e) {
                    log.debug("[ass-engine] session={} 拉取事件失败（下轮重试）: {}", sessionKey, e.getMessage());
                    return;
                }
                cn.hutool.json.JSONArray data = page.getJSONArray("data");
                if (data != null) {
                    for (int i = 0; i < data.size(); i++) {
                        onServiceEvent(data.getJSONObject(i));
                    }
                }
                String next = page.getStr("next_cursor", eventCursor);
                if (next == null || next.isEmpty() || next.equals(eventCursor)) {
                    persistClosedRounds();
                    return; // 无增量
                }
                eventCursor = next;
                if (data == null || data.isEmpty()) {
                    persistClosedRounds();
                    return;
                }
            }
            persistClosedRounds();
        }

        /** 把已关闭的模型轮次镜像写进 LLM 账本（Trajectory 模型泳道的数据源） */
        private void persistClosedRounds() {
            if (llmCallLogService == null) {
                return;
            }
            for (AgentServiceEventTranslator.ModelRound r : translator.drainClosedRounds()) {
                try {
                    cn.boommanpro.gaia.workflow.infra.manage.entity.AgentLlmCallLog row =
                        new cn.boommanpro.gaia.workflow.infra.manage.entity.AgentLlmCallLog();
                    row.setSessionKey(sessionKey);
                    row.setRunId(context.getRequest().getRunId());
                    row.setSeq(r.seq);
                    row.setModel(r.model != null && !r.model.isEmpty() ? r.model : cfg.getModel());
                    // 远端托管调用：模型可见输入由 Service 数据面组装（系统提示词/会话历史/工具
                    // schema 本地不可见），诚实走 digestOnly 口径，不伪造请求
                    row.setPromptDigest("远端托管调用（AgentScope Service 数据面组装请求：系统提示词 + 会话历史 + 工具 schema），本地不落全量请求");
                    row.setMessagesCount(null);
                    row.setToolsCount(r.toolCalls.size());
                    String output = (r.thinking.length() > 0 ? "<think>\n" + r.thinking + "\n</think>\n" : "")
                        + r.content;
                    row.setOutputDigest(output.length() > 2000
                        ? output.substring(0, 1000) + "…(中略)…" + output.substring(output.length() - 1000)
                        : output);
                    JSONObject response = new JSONObject()
                        .set("mirror", true)
                        .set("note", "远端调用镜像行：按 Service 事件反推的每轮输出，非服务端原始响应")
                        .set("model", row.getModel())
                        .set("thinking", r.thinking.toString())
                        .set("content", r.content.toString())
                        .set("toolCalls", r.toolCalls)
                        .set("usage", new JSONObject()
                            .set("inputTokens", r.inputTokens)
                            .set("outputTokens", r.outputTokens)
                            .set("cachedTokens", r.cachedTokens))
                        .set("durationMs", r.endedAt > 0 ? r.endedAt - r.startedAt : null);
                    row.setRequestJson(null);
                    row.setResponseJson(response.toString());
                    row.setPromptTokens(r.inputTokens != null ? r.inputTokens.intValue() : null);
                    row.setCompletionTokens(r.outputTokens != null ? r.outputTokens.intValue() : null);
                    row.setCachedTokens(r.cachedTokens != null ? r.cachedTokens.intValue() : null);
                    row.setDurationMs(r.endedAt > 0 ? r.endedAt - r.startedAt : null);
                    row.setStatus("ok");
                    row.setCreatedAt(java.time.LocalDateTime.now().toString());
                    llmCallLogService.save(row);
                } catch (Exception e) {
                    log.debug("[ass-engine] session={} 模型轮次镜像落账失败（忽略）: {}", sessionKey, e.getMessage());
                }
            }
        }

        /** 事件分发：去重 → 终态/控制事件直处理 → 其余翻译后广播 */
        private void onServiceEvent(JSONObject event) {
            try {
                String eventId = event.getStr("id");
                if (eventId != null && !seenEventIds.add(eventId)) {
                    return;
                }
                String type = event.getStr("type", "");
                JSONObject data = event.getJSONObject("data");
                if (data == null) {
                    data = new JSONObject();
                }
                switch (type) {
                    case "tool.requested":
                        trackToolCall(data);
                        for (AgentEvent translated : translator.translate(event)) {
                            sink.emit(translated);
                        }
                        return;
                    case "tool.completed":
                        trackToolCompletion(data);
                        for (AgentEvent translated : translator.translate(event)) {
                            sink.emit(translated);
                        }
                        return;
                    case "turn.completed":
                    case "turn.failed":
                        if (isOurTurn(data)) {
                            if ("turn.failed".equals(type)) {
                                JSONObject error = data.getJSONObject("error");
                                if (error != null) {
                                    endReason.compareAndSet(null,
                                        "error:" + error.getStr("code", "TurnFailed"));
                                } else {
                                    endReason.compareAndSet(null, "error:TurnFailed");
                                }
                            }
                            completion.countDown();
                        }
                        return;
                    case "session.status_idle":
                        // 备用终止信号（事件丢失时兜底）；运行开始过才生效
                        if (turnId != null) {
                            completion.countDown();
                        }
                        return;
                    case "session.status_terminated":
                        log.warn("[ass-engine] session={} Service Session 已终止", sessionKey);
                        endReason.compareAndSet(null, "terminated");
                        completion.countDown();
                        return;
                    default:
                        for (AgentEvent translated : translator.translate(event)) {
                            sink.emit(translated);
                        }
                }
            } catch (Exception e) {
                log.warn("[ass-engine] session={} 处理事件异常（已跳过）: {}", sessionKey, e.getMessage());
            }
        }

        private boolean isOurTurn(JSONObject data) {
            if (turnId == null) {
                return false;
            }
            String eventTurn = data.getStr("turn_id", data.getStr("turnId"));
            return eventTurn == null || eventTurn.isEmpty() || eventTurn.equals(turnId);
        }

        // ---------------- 复读熔断（对齐本地引擎「同参连续失败硬熔断」护栏） ----------------

        /** 记录工具调用指纹（tool.requested） */
        private void trackToolCall(JSONObject data) {
            String callId = data.getStr("tool_call_id", "");
            if (callId.isEmpty()) {
                return;
            }
            String name = data.getStr("name", "");
            String args = String.valueOf(data.get("input"));
            callFingerprints.put(callId, name + "|" + args);
        }

        /** 工具完成即判定成败，同名同参连续失败达阈值则取消本轮（熔断） */
        private void trackToolCompletion(JSONObject data) {
            JSONObject result = data.getJSONObject("result");
            if (result == null) {
                return;
            }
            String callId = result.getStr("id", "");
            String fingerprint = callFingerprints.getOrDefault(callId, result.getStr("name", ""));
            // 失败形态（实测）：Gaia MCP 返回的 isError 由数据面转为文本 "Error: {...}"
            String firstText = "";
            JSONArray output = result.getJSONArray("output");
            if (output != null && !output.isEmpty() && output.getJSONObject(0) != null) {
                firstText = output.getJSONObject(0).getStr("text", "");
            }
            boolean failed = firstText.startsWith("Error") || firstText.contains("\"isError\":true")
                || "ERROR".equalsIgnoreCase(result.getStr("state", ""));
            if (!failed) {
                lastFailureFingerprint.set(null);
                consecutiveFailures.set(0);
                return;
            }
            String last = lastFailureFingerprint.get();
            if (!fingerprint.equals(last)) {
                // 换了参数/工具：重新计数
                lastFailureFingerprint.set(fingerprint);
                consecutiveFailures.set(1);
                return;
            }
            int strikes = consecutiveFailures.incrementAndGet();
            log.warn("[ass-engine] session={} 工具 {} 同参连续失败 {}/{}",
                sessionKey, result.getStr("name", ""), strikes, REPEAT_FAILURE_LIMIT);
            if (strikes >= REPEAT_FAILURE_LIMIT && cancelSent.compareAndSet(false, true)) {
                String toolName = result.getStr("name", "");
                log.warn("[ass-engine] session={} 复读熔断：{} 以相同参数连续失败 {} 次，取消本轮",
                    sessionKey, toolName, strikes);
                if (turnId != null) {
                    client.cancelTurn(cfg, remoteSessionId, turnId);
                }
                endReason.compareAndSet(null, "error:复读熔断——工具 " + toolName
                    + " 以相同参数连续失败 " + strikes + " 次。请调整参数（按报错里的修复指引补全 data）后再试，"
                    + "或换一种实现方式");
                completion.countDown();
            }
        }

        // ---------------- 阶段四：收尾 ----------------

        /** 轮询 Turn 状态；到终态时记录快照并触发完成，返回是否终态 */
        private boolean pollTurnStatus() {
            if (turnId == null) {
                return false;
            }
            try {
                JSONObject turn = client.getTurn(cfg, remoteSessionId, turnId);
                String status = turn.getStr("status", "");
                if (TERMINAL_STATUSES.contains(status)) {
                    terminalTurn.set(turn);
                    if ("failed".equals(status)) {
                        JSONObject error = turn.getJSONObject("error");
                        if (error != null) {
                            endReason.compareAndSet(null, "error:" + error.getStr("code", "TurnFailed"));
                        } else {
                            endReason.compareAndSet(null, "error:TurnFailed");
                        }
                    } else if ("cancelled".equals(status)) {
                        endReason.compareAndSet(null, "cancelled");
                    } else if ("timed_out".equals(status)) {
                        endReason.compareAndSet(null, "error:Turn 超时");
                    }
                    completion.countDown();
                    return true;
                }
            } catch (Exception e) {
                log.debug("[ass-engine] session={} 轮询 Turn 状态失败（继续）: {}", sessionKey, e.getMessage());
            }
            return false;
        }

        private AgentRunResult finalizeRun() {
            String reason = endReason.get() == null ? "end_turn" : endReason.get();
            persistClosedRounds();
            sessionService.recordUsage(sessionKey, translator.getUsageJson());

            if (reason.startsWith("error:")) {
                String message = reason.substring("error:".length());
                sink.emit(AgentEvent.of("error", new JSONObject().set("message", message)));
                return AgentRunResult.failure(message);
            }
            if ("terminated".equals(reason)) {
                // 尽量带上终态错误码（如 MAX_ITERATIONS），避免只有一句"已终止"无从排查
                String detail = "";
                JSONObject terminal = terminalTurn.get();
                if (terminal != null && terminal.getJSONObject("error") != null) {
                    detail = "（" + terminal.getJSONObject("error").getStr("code", "") + "）";
                }
                String message = "AgentScope Service Session 已终止" + detail
                    + "——通常是本轮迭代达到上限或运行被服务端终止";
                sink.emit(AgentEvent.of("error", new JSONObject().set("message", message)));
                return AgentRunResult.failure(message);
            }
            if ("cancelled".equals(reason)) {
                return AgentRunResult.failure("用户中断");
            }

            // 终态正文：优先 getTurn 快照的 result（权威终版，需剥离 <think> 段），
            // 退化用事件增量累积（翻译器已把思考段拆到 thinking）
            String content = translator.getFinalContent();
            JSONObject terminal = terminalTurn.get();
            if (terminal != null && terminal.getStr("result") != null && !terminal.getStr("result").isEmpty()) {
                content = AgentServiceEventTranslator.stripThinkBlocks(terminal.getStr("result"));
            }
            String thinking = translator.getFinalThinking();
            conversationStore.saveMessage(sessionKey, "assistant", content, null, null, thinking);
            // 对齐本地引擎：assistant_settled 落持久事件表（Trajectory 消息行的数据来源），
            // 思考全文随事件走（thinking 流本身是高频事件不入表）
            sink.emit(AgentEvent.of("assistant_settled", new JSONObject()
                .set("content", content)
                .set("thinking", thinking)
                .set("promptTokens", (int) translator.getInputTokens())
                .set("completionTokens", (int) translator.getOutputTokens())));
            AgentRunResult result = AgentRunResult.success(
                content, definition.getId(), sessionKey, translator.getModelRequests());
            log.info("[ass-engine] session={} 运行完成 contentLength={} usage={}",
                sessionKey, content.length(), translator.getUsageJson());
            return result;
        }
    }
}
