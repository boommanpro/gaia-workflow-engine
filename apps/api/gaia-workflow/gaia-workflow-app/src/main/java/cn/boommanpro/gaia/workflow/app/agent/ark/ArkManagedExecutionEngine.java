package cn.boommanpro.gaia.workflow.app.agent.ark;

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
import cn.boommanpro.gaia.workflow.app.agent.tool.ToolExecutor;
import cn.boommanpro.gaia.workflow.app.agent.tool.ToolExecutorRegistry;
import cn.boommanpro.gaia.workflow.app.agent.tool.ToolResult;
import cn.boommanpro.gaia.workflow.app.service.AgentProviderConfigService;
import cn.hutool.json.JSONArray;
import cn.hutool.json.JSONObject;
import cn.hutool.json.JSONUtil;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicReference;
import javax.annotation.PreDestroy;

/**
 * 火山方舟托管执行引擎 —— 把对话循环托管给方舟 Managed Agents，本服务做四件事：
 * 会话映射（本地 sessionKey ↔ 方舟 sesn-*）、事件翻译（{@link ArkEventTranslator}）、
 * 自定义工具回传（{@code agent.custom_tool_use} → {@link ToolExecutorRegistry} →
 * {@code user.custom_tool_result}）、中断与用量同步。
 *
 * <p>运行时序（官方协议要求「先开流、再发消息」）：</p>
 * <pre>
 *   路由 Agent → 校验定义/配置 → 确保（或创建）方舟 Session
 *   → 打开 SSE 流（等 : ready）→ 发送 user.message → 消费事件流
 *   → end_turn 结束 / requires_action 挂起执行自定义工具 / 用户中断发 user.interrupt
 * </pre>
 *
 * <p>SSE 断线按官方推荐流程恢复：重开流 → 分页拉历史事件 → 按事件 id 去重后补投，
 * 仅处理本次 user.message 回执之后的事件，避免回放历史轮次。</p>
 */
@Slf4j
@Component
@Order(2)
public class ArkManagedExecutionEngine implements AgentExecutionEngine {

    public static final String ENGINE_ID = "ark";

    /** 单次运行兜底上限（方舟负责轮次控制，这里只防僵尸线程） */
    private static final long MAX_RUN_MILLIS = 30 * 60 * 1000L;
    /** SSE 断线重连尝试次数 */
    private static final int MAX_RECONNECTS = 5;
    private static final long RECONNECT_BACKOFF_MS = 2000;
    /** 发事件重试次数（409 队列满 / 限流 / 5xx） */
    private static final int SEND_RETRIES = 3;

    private final AgentRegistry agentRegistry;
    private final ArkManagedClient client;
    private final AgentProviderConfigService providerConfigService;
    private final ArkAgentSessionService arkSessionService;
    private final ArkAgentProvisioningService provisioningService;
    private final ToolExecutorRegistry toolExecutorRegistry;
    private final ConversationStore conversationStore;

    /** 自定义工具执行池：SSE 读取线程只负责收事件，耗时工具在线程池里跑，避免阻塞 TCP 窗口 */
    private final ExecutorService toolPool = Executors.newCachedThreadPool(r -> {
        Thread t = new Thread(r, "ark-custom-tool");
        t.setDaemon(true);
        return t;
    });

    public ArkManagedExecutionEngine(AgentRegistry agentRegistry,
                                     ArkManagedClient client,
                                     AgentProviderConfigService providerConfigService,
                                     ArkAgentSessionService arkSessionService,
                                     ArkAgentProvisioningService provisioningService,
                                     ToolExecutorRegistry toolExecutorRegistry,
                                     ConversationStore conversationStore) {
        this.agentRegistry = agentRegistry;
        this.client = client;
        this.providerConfigService = providerConfigService;
        this.arkSessionService = arkSessionService;
        this.provisioningService = provisioningService;
        this.toolExecutorRegistry = toolExecutorRegistry;
        this.conversationStore = conversationStore;
    }

    @PreDestroy
    public void destroy() {
        toolPool.shutdownNow();
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
        AgentProviderConfigService.ArkConfig cfg = providerConfigService.getArkConfig();
        if (!arkSessionService.isArkConfigured(cfg)) {
            String message = "方舟托管未配置：请在配置中心填写 provider_config:ark（apiKey / environmentId）";
            safeSink.emit(AgentEvent.of("error", new JSONObject().set("message", message)));
            return AgentRunResult.failure(message);
        }

        // 远端 Agent 资源解析：手动绑定直接用；未绑定则自动同步（首次创建 / 变更时带版本号更新，
        // 工具 schema 自动映射为 Custom Tool），免去在方舟控制台手工建 Agent 与抄录 schema
        String remoteAgentId;
        Integer remoteAgentVersion;
        if (provisioningService.isManuallyBound(definition)) {
            remoteAgentId = definition.getArkAgentId();
            remoteAgentVersion = definition.getArkAgentVersion();
        } else {
            try {
                ArkAgentProvisioningService.ProvisionedAgent provisioned =
                    provisioningService.ensureProvisioned(definition);
                remoteAgentId = provisioned.getAgentId();
                remoteAgentVersion = provisioned.getVersion();
            } catch (Exception e) {
                String message = "方舟 Agent 自动同步失败（定义 " + definition.getId() + "）: " + e.getMessage();
                log.error("[ark-engine] {}", message, e);
                safeSink.emit(AgentEvent.of("error", new JSONObject().set("message", message)));
                return AgentRunResult.failure(message);
            }
        }

        if (request.getSessionKey() == null || request.getSessionKey().isEmpty()) {
            request.setSessionKey(conversationStore.newSessionKey());
        }
        // ark 引擎的工具一律在服务端回传（custom tool 协议），执行面固定后端
        AgentRunContext context = new AgentRunContext(request, definition, ToolExecutionMode.BACKEND);
        context.setSink(safeSink);

        ArkRun run = new ArkRun(definition, context, cfg, safeSink, remoteAgentId, remoteAgentVersion);
        return run.execute();
    }

    // ---------------- 一次运行的状态封装 ----------------

    private final class ArkRun {

        private final AgentDefinition definition;
        private final AgentRunContext context;
        private final AgentProviderConfigService.ArkConfig cfg;
        private final AgentEventSink sink;
        /** provisioning 结果（手动绑定或自动同步产出），创建 Session 时绑定 */
        private final String remoteAgentId;
        private final Integer remoteAgentVersion;

        private final String sessionKey;
        /** 惰性解析：execute() 里确保远端 Session（已绑定复用，未绑定创建），失败转运行错误 */
        private volatile String remoteSessionId;

        private final ArkEventTranslator translator = new ArkEventTranslator();
        /** 已处理过的事件 id（sevt-*）：重连补投历史时去重 */
        private final Set<String> seenEventIds = ConcurrentHashMap.newKeySet();
        /** 正在执行中的自定义工具（callId → 状态），防止重复派发 */
        private final ConcurrentMap<String, Boolean> dispatchingTools = new ConcurrentHashMap<>();
        private final CountDownLatch completion = new CountDownLatch(1);
        private final AtomicBoolean interruptSent = new AtomicBoolean(false);
        private final AtomicReference<String> endReason = new AtomicReference<>(null);
        private final AtomicReference<ArkManagedClient.StreamHandle> streamRef = new AtomicReference<>(null);
        private final AtomicReference<String> lastError = new AtomicReference<>(null);
        /** 本次 user.message 在方舟侧的事件回执 id（重连补投的历史从此事件之后算起） */
        private volatile String userMessageEventId = null;
        private final List<String> executedTools = new ArrayList<>();
        /** 本次运行实际派发的自定义工具调用（落库 assistant.tool_calls，供审查页回放） */
        private final List<LlmToolCall> executedToolCalls = java.util.Collections.synchronizedList(new ArrayList<>());

        ArkRun(AgentDefinition definition, AgentRunContext context,
               AgentProviderConfigService.ArkConfig cfg, AgentEventSink sink,
               String remoteAgentId, Integer remoteAgentVersion) {
            this.definition = definition;
            this.context = context;
            this.cfg = cfg;
            this.sink = sink;
            this.remoteAgentId = remoteAgentId;
            this.remoteAgentVersion = remoteAgentVersion;
            this.sessionKey = context.getSessionKey();
        }

        AgentRunResult execute() {
            try {
                remoteSessionId = arkSessionService.ensureRemoteSession(sessionKey, remoteAgentId, remoteAgentVersion,
                    () -> {
                        cn.boommanpro.gaia.workflow.infra.manage.entity.AgentSession row =
                            arkSessionService.findByKey(sessionKey);
                        String title = row != null && row.getTitle() != null && !row.getTitle().isEmpty()
                            ? row.getTitle() : sessionKey;
                        JSONObject created = client.createSession(cfg, remoteAgentId, remoteAgentVersion, title);
                        return created.getStr("id");
                    });
                log.info("[ark-engine] session={} → 方舟 Session {} 启动运行 (agent={} v{})",
                    sessionKey, remoteSessionId, remoteAgentId,
                    remoteAgentVersion != null ? remoteAgentVersion : "latest");
                openStreamWithHistoryReplay();
                sendUserMessage();
                awaitCompletion();
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                endReason.compareAndSet(null, "error:interrupted");
            } catch (Exception e) {
                log.error("[ark-engine] session={} 运行异常: {}", sessionKey, e.getMessage(), e);
                endReason.compareAndSet(null, "error:" + e.getMessage());
            } finally {
                ArkManagedClient.StreamHandle stream = streamRef.get();
                if (stream != null) {
                    stream.close();
                }
            }
            return finalizeRun();
        }

        // ---------------- 阶段一：开流 ----------------

        /** 开流；首次开流即失联时退避重试，运行中断联后重连并补投历史事件 */
        private void openStreamWithHistoryReplay() throws InterruptedException {
            String currentEventId = userMessageEventId;
            for (int attempt = 1; attempt <= MAX_RECONNECTS; attempt++) {
                try {
                    ArkManagedClient.StreamHandle handle = client.openEventStream(
                        cfg, remoteSessionId, this::onArkEvent, null);
                    streamRef.set(handle);
                    if (attempt > 1) {
                        log.info("[ark-engine] session={} 第 {} 次重连成功，补投历史事件", sessionKey, attempt);
                        replayHistoryAfter(currentEventId);
                    }
                    return;
                } catch (ArkApiException e) {
                    if (!e.isRetryable() || attempt == MAX_RECONNECTS) {
                        throw new IllegalStateException("打开方舟事件流失败: " + e.getMessage(), e);
                    }
                    log.warn("[ark-engine] session={} 开流失败（{}），{}ms 后重试",
                        sessionKey, e.getMessage(), RECONNECT_BACKOFF_MS * attempt);
                    TimeUnit.MILLISECONDS.sleep(RECONNECT_BACKOFF_MS * attempt);
                }
            }
        }

        /** 分页拉取历史事件，只处理本次 user.message 回执之后且未见过的部分 */
        private void replayHistoryAfter(String afterEventId) {
            String page = null;
            boolean draining = true;
            boolean afterTarget = afterEventId == null; // 无基准（发送前断联）时全部跳过历史
            for (int safety = 0; draining && safety < 100; safety++) {
                JSONObject response = client.getEventHistoryPage(cfg, remoteSessionId, page);
                JSONArray data = response.getJSONArray("data");
                if (data == null) {
                    break;
                }
                for (int i = 0; i < data.size(); i++) {
                    JSONObject event = data.getJSONObject(i);
                    if (!afterTarget) {
                        afterTarget = event.getStr("id") != null && event.getStr("id").equals(afterEventId);
                        continue;
                    }
                    onArkEvent(event);
                }
                page = response.getStr("next_page");
                draining = page != null && !page.isEmpty();
            }
        }

        // ---------------- 阶段二：发消息 ----------------

        private void sendUserMessage() {
            JSONArray content = new JSONArray();
            JSONObject textBlock = new JSONObject().set("type", "text").set("text", context.getUserMessage());
            content.add(textBlock);
            if (context.getPageContext() != null && !context.getPageContext().isEmpty()) {
                content.add(new JSONObject().set("type", "text")
                    .set("text", "\n\n[页面上下文快照] 当前页面的路由与画布信息如下"
                        + "（本快照取代更早的页面上下文信息，仅对理解用户意图有效）：\n```json\n"
                        + context.getPageContext() + "\n```"));
            }
            JSONArray events = new JSONArray();
            events.add(new JSONObject().set("type", "user.message").set("content", content));

            JSONObject response = sendEventsWithRetry(events);
            JSONArray accepted = response.getJSONArray("data");
            if (accepted != null && !accepted.isEmpty() && accepted.getJSONObject(0) != null) {
                userMessageEventId = accepted.getJSONObject(0).getStr("id");
                log.debug("[ark-engine] session={} user.message 受理 eventId={}", sessionKey, userMessageEventId);
            }
        }

        private JSONObject sendEventsWithRetry(JSONArray events) {
            ArkApiException last = null;
            for (int attempt = 1; attempt <= SEND_RETRIES; attempt++) {
                try {
                    return client.sendEvents(cfg, remoteSessionId, events);
                } catch (ArkApiException e) {
                    last = e;
                    if (!e.isRetryable()) {
                        throw e;
                    }
                    // 官方指引：409 队列满不要快速重试，退避等消费
                    long backoff = e.isQueueFull() ? 2000L * attempt : 500L * attempt;
                    log.warn("[ark-engine] session={} 发事件失败（HTTP {}），{}ms 后第 {} 次重试",
                        sessionKey, e.getStatusCode(), backoff, attempt);
                    try {
                        TimeUnit.MILLISECONDS.sleep(backoff);
                    } catch (InterruptedException ie) {
                        Thread.currentThread().interrupt();
                        throw e;
                    }
                }
            }
            throw last;
        }

        // ---------------- 阶段三：事件循环 ----------------

        /** SSE 读取线程回调：去重 → 控制事件直处理 → 其余翻译后广播（自定义工具异步派发） */
        private void onArkEvent(JSONObject event) {
            try {
                String eventId = event.getStr("id");
                if (eventId != null && !seenEventIds.add(eventId)) {
                    return;
                }
                String type = event.getStr("type", "");
                switch (type) {
                    case "session.status_idle":
                        onIdle(event);
                        return;
                    case "session.status_terminated":
                        log.warn("[ark-engine] session={} 方舟 Session 已终止", sessionKey);
                        endReason.compareAndSet(null, "terminated");
                        completion.countDown();
                        return;
                    case "session.error":
                        // 可恢复错误（限流/过载）方舟会自动 rescheduling，不污染运行快照，仅记录
                        String errorType = event.getStr("error_type", event.getStr("type"));
                        log.warn("[ark-engine] session={} 方舟错误信号: {}", sessionKey, event);
                        lastError.set(errorType);
                        return;
                    case "session.status_rescheduled":
                        log.info("[ark-engine] session={} 方舟自动重排恢复", sessionKey);
                        lastError.set(null);
                        return;
                    default:
                        for (AgentEvent translated : translator.translate(event)) {
                            dispatchIfCustomTool(event, translated);
                            sink.emit(translated);
                        }
                }
            } catch (Exception e) {
                log.warn("[ark-engine] session={} 处理事件异常（已跳过）: {}", sessionKey, e.getMessage());
            }
        }

        private void onIdle(JSONObject event) {
            JSONObject stopReason = event.getJSONObject("stop_reason");
            String reason = stopReason != null ? stopReason.getStr("type", "end_turn") : "end_turn";
            if ("requires_action".equals(reason)) {
                // 自定义工具的执行由 agent.custom_tool_use 事件驱动，全部结果回传后方舟自动恢复 running
                log.info("[ark-engine] session={} 等待工具执行（requires_action）", sessionKey);
                return;
            }
            endReason.compareAndSet(null, "end_turn");
            completion.countDown();
        }

        /** 自定义工具调用 → 交给工具池执行并回传（translated 事件已先广播给前端展示） */
        private void dispatchIfCustomTool(JSONObject arkEvent, AgentEvent translated) {
            if (!"tool_call".equals(translated.getType())) {
                return;
            }
            JSONObject data = translated.getData();
            if (!"backend".equals(data.getStr("executedBy"))) {
                return;
            }
            String callId = data.getStr("id");
            if (callId == null || dispatchingTools.putIfAbsent(callId, Boolean.TRUE) != null) {
                return;
            }
            toolPool.execute(() -> executeCustomTool(arkEvent, callId));
        }

        private void executeCustomTool(JSONObject arkEvent, String callId) {
            String name = arkEvent.getStr("name", "");
            JSONObject args = parseArkInput(arkEvent.get("input"));
            LlmToolCall call = new LlmToolCall(callId, name, args.toString());
            log.info("[ark-engine] session={} 执行自定义工具 {} args={}", sessionKey, name, args);

            ToolResult result;
            Optional<ToolExecutor> executor = toolExecutorRegistry.get(name);
            if (!executor.isPresent() || !executor.get().canRunOnBackend()) {
                result = ToolResult.unavailable(
                    "工具 " + name + " 不可用或需要浏览器界面，请改用可在服务端完成的方式");
            } else {
                try {
                    result = executor.get().execute(args, context);
                } catch (Exception e) {
                    log.warn("[ark-engine] session={} 工具 {} 执行异常: {}", sessionKey, name, e.getMessage());
                    result = ToolResult.fail("{\"error\":\"" + e.getMessage() + "\"}", "工具执行异常");
                }
            }

            executedTools.add(name);
            executedToolCalls.add(call);
            sink.emit(AgentEvent.of("tool_result", new JSONObject()
                .set("toolCallId", callId)
                .set("name", name)
                .set("rejected", result.isRejected())
                .set("payload", result.getPayload())));
            conversationStore.saveMessage(sessionKey, "tool", result.getPayload(), null, callId);

            JSONArray resultContent = new JSONArray();
            resultContent.add(new JSONObject().set("type", "text").set("text", result.getPayload()));
            JSONArray events = new JSONArray();
            events.add(new JSONObject()
                .set("type", "user.custom_tool_result")
                .set("custom_tool_use_id", callId)
                .set("is_error", !result.isSuccess())
                .set("content", resultContent));
            try {
                sendEventsWithRetry(events);
                log.info("[ark-engine] session={} 工具 {} 结果已回传 (success={})",
                    sessionKey, name, result.isSuccess());
            } catch (Exception e) {
                log.error("[ark-engine] session={} 工具 {} 结果回传失败: {}", sessionKey, name, e.getMessage());
                endReason.compareAndSet(null, "error:工具结果回传失败 " + name + ": " + e.getMessage());
                completion.countDown();
            } finally {
                dispatchingTools.remove(callId);
            }
        }

        // ---------------- 阶段四：等待与收尾 ----------------

        private void awaitCompletion() throws InterruptedException {
            long deadline = System.currentTimeMillis() + MAX_RUN_MILLIS;
            while (true) {
                if (completion.await(500, TimeUnit.MILLISECONDS)) {
                    return;
                }
                if (!sink.isActive() && interruptSent.compareAndSet(false, true)) {
                    // 用户已停止：转发 user.interrupt（中断会清空未调度消息），短暂等待后收尾
                    log.info("[ark-engine] session={} 用户停止，发送 user.interrupt", sessionKey);
                    try {
                        JSONArray events = new JSONArray();
                        events.add(new JSONObject().set("type", "user.interrupt"));
                        client.sendEvents(cfg, remoteSessionId, events);
                    } catch (Exception e) {
                        log.warn("[ark-engine] session={} 发送中断失败（忽略）: {}", sessionKey, e.getMessage());
                    }
                    endReason.compareAndSet(null, "cancelled");
                    completion.await(10, TimeUnit.SECONDS);
                    return;
                }
                if (System.currentTimeMillis() > deadline) {
                    log.warn("[ark-engine] session={} 运行超过兜底上限 {} 分钟，强制收尾",
                        sessionKey, MAX_RUN_MILLIS / 60000);
                    endReason.compareAndSet(null, "error:运行超时");
                    return;
                }
            }
        }

        private AgentRunResult finalizeRun() {
            String reason = endReason.get() == null ? "end_turn" : endReason.get();
            arkSessionService.recordUsage(sessionKey, translator.getUsageJson());

            if (reason.startsWith("error:")) {
                String message = reason.substring("error:".length());
                sink.emit(AgentEvent.of("error", new JSONObject().set("message", message)));
                return AgentRunResult.failure(message);
            }
            if ("terminated".equals(reason)) {
                String message = "方舟 Session 已终止" + (lastError.get() != null ? "（" + lastError.get() + "）" : "");
                sink.emit(AgentEvent.of("error", new JSONObject().set("message", message)));
                return AgentRunResult.failure(message);
            }
            if ("cancelled".equals(reason)) {
                return AgentRunResult.failure("用户中断");
            }

            // end_turn：正文镜像落库（user 消息由 AgentSessionRunService 落库，tool 消息随执行落库）
            String content = translator.getFinalContent();
            String thinking = translator.getFinalThinking();
            String toolCallsJson = executedToolCalls.isEmpty() ? null : toToolCallsJson(executedToolCalls);
            conversationStore.saveMessage(sessionKey, "assistant", content, toolCallsJson, null, thinking);
            AgentRunResult result = AgentRunResult.success(
                content, definition.getId(), sessionKey, translator.getModelRequests());
            result.setExecutedTools(executedTools);
            log.info("[ark-engine] session={} 运行完成 turns={} contentLength={} usage={}",
                sessionKey, translator.getModelRequests(), content.length(), translator.getUsageJson());
            return result;
        }
    }

    /** 方舟 custom_tool_use 的 input → JSONObject（字符串形态宽松解析） */
    private static JSONObject parseArkInput(Object input) {
        if (input instanceof JSONObject) {
            return (JSONObject) input;
        }
        if (input instanceof String && !((String) input).isEmpty()) {
            try {
                return JSONUtil.parseObj((String) input);
            } catch (Exception e) {
                return new JSONObject().set("_raw", input);
            }
        }
        return new JSONObject();
    }

    /** 工具调用列表 → agent_message.tool_calls 的 JSON 形态（与 local 引擎一致） */
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
