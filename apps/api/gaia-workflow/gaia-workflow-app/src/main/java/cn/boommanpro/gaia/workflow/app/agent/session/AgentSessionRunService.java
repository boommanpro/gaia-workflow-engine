package cn.boommanpro.gaia.workflow.app.agent.session;

import cn.boommanpro.gaia.workflow.app.agent.core.AgentRequest;
import cn.boommanpro.gaia.workflow.app.agent.core.AgentRunResult;
import cn.boommanpro.gaia.workflow.app.agent.core.ConversationStore;
import cn.boommanpro.gaia.workflow.app.agent.core.ToolExecutionMode;
import cn.boommanpro.gaia.workflow.app.agent.engine.AgentExecutionRouter;
import cn.boommanpro.gaia.workflow.app.agent.event.AgentEventSink;
import cn.boommanpro.gaia.workflow.app.agent.event.BusAgentEventSink;
import cn.boommanpro.gaia.workflow.app.service.AgentProviderConfigService;
import cn.boommanpro.gaia.workflow.infra.manage.entity.AgentSession;
import cn.boommanpro.gaia.workflow.infra.manage.service.AgentSessionService;
import cn.boommanpro.gaia.workflow.infra.manage.service.AgentToolCallLogService;
import cn.hutool.json.JSONObject;
import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import javax.annotation.PreDestroy;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicBoolean;

/**
 * 会话级异步运行编排 —— 「纯后端、多窗口、关窗继续」的入口。
 *
 * <p>与旧链路（前端 POST /agent/chat 拿 SSE、收到 tool_call 后前端执行再回灌）的区别：</p>
 * <ul>
 *   <li>调用方发一条消息即返回，后端在独立线程里用执行引擎跑完整循环
 *       （local 自研编排 / ark 方舟托管，由 {@link AgentExecutionRouter} 按 Agent 定义选择）</li>
 *   <li>循环与工具执行都在后端，不依赖任何浏览器窗口存活</li>
 *   <li>运行事件进 {@link SessionEventBus}，任意数量窗口可订阅 / 回放</li>
 * </ul>
 */
@Slf4j
@Service
public class AgentSessionRunService {

    /** 同一会话同一时刻只允许一个运行，避免消息交叉 */
    public static final class RunHandle {
        private final String runId;
        private final String sessionKey;
        private final long startedAt;
        private final AtomicBoolean cancelled = new AtomicBoolean(false);
        private final AtomicBoolean finished = new AtomicBoolean(false);

        RunHandle(String runId, String sessionKey) {
            this.runId = runId;
            this.sessionKey = sessionKey;
            this.startedAt = System.currentTimeMillis();
        }

        public String getRunId() {
            return runId;
        }

        public String getSessionKey() {
            return sessionKey;
        }

        public boolean isCancelled() {
            return cancelled.get();
        }

        public boolean isFinished() {
            return finished.get();
        }

        void cancel() {
            cancelled.set(true);
        }

        void markFinished() {
            finished.set(true);
        }
    }

    /** 启动运行的结果 */
    public static final class StartResult {
        public final boolean accepted;
        public final String sessionKey;
        public final String runId;
        public final String error;

        private StartResult(boolean accepted, String sessionKey, String runId, String error) {
            this.accepted = accepted;
            this.sessionKey = sessionKey;
            this.runId = runId;
            this.error = error;
        }

        public static StartResult accepted(String sessionKey, String runId) {
            return new StartResult(true, sessionKey, runId, null);
        }

        public static StartResult conflict(String error) {
            return new StartResult(false, null, null, error);
        }

        public JSONObject toJson() {
            JSONObject json = new JSONObject().set("accepted", accepted);
            if (sessionKey != null) {
                json.set("sessionKey", sessionKey);
            }
            if (runId != null) {
                json.set("runId", runId);
            }
            if (error != null) {
                json.set("error", error);
            }
            return json;
        }
    }

    /** 工作区后端自治 Agent 的默认 id（请求未指定时使用） */
    public static final String DEFAULT_AGENT_ID = "workspace-backend";

    private final AgentExecutionRouter executionRouter;
    private final SessionEventBus eventBus;
    private final ConversationStore conversationStore;
    private final AgentSessionService sessionService;
    private final AgentToolCallLogService toolCallLogService;
    private final AgentProviderConfigService providerConfigService;
    private final cn.boommanpro.gaia.workflow.infra.manage.service.AgentSessionEventService sessionEventService;
    private final SessionCompactionService compactionService;

    private final ConcurrentMap<String, RunHandle> runs = new ConcurrentHashMap<>();
    /** 会话级 steering 收件箱：run 进行中的新消息在 turn 边界注入；run 结束后残留消息链接成新 run */
    private final ConcurrentMap<String, cn.boommanpro.gaia.workflow.app.agent.core.SteeringInbox> steeringInboxes =
        new ConcurrentHashMap<>();

    private final ExecutorService executor = Executors.newCachedThreadPool(r -> {
        Thread t = new Thread(r, "agent-session-run");
        t.setDaemon(true);
        return t;
    });

    public AgentSessionRunService(AgentExecutionRouter executionRouter,
                                  SessionEventBus eventBus,
                                  ConversationStore conversationStore,
                                  AgentSessionService sessionService,
                                  AgentProviderConfigService providerConfigService,
                                  cn.boommanpro.gaia.workflow.infra.manage.service.AgentSessionEventService sessionEventService,
                                  SessionCompactionService compactionService,
                                  cn.boommanpro.gaia.workflow.infra.manage.service.AgentToolCallLogService toolCallLogService) {
        this.executionRouter = executionRouter;
        this.eventBus = eventBus;
        this.conversationStore = conversationStore;
        this.sessionService = sessionService;
        this.providerConfigService = providerConfigService;
        this.sessionEventService = sessionEventService;
        this.compactionService = compactionService;
        this.toolCallLogService = toolCallLogService;
    }

    @PreDestroy
    public void destroy() {
        executor.shutdown();
    }

    // ---------------- 运行入口 ----------------

    /**
     * 在指定会话上异步启动一次后端自治运行。
     * 立即返回受理结果；运行在后台线程推进，事件进会话事件总线。
     *
     * <p>run 进行中再来消息不再拒绝（旧 conflict 语义），而是进入 steering 收件箱：
     * 运行循环在下一个 turn 边界把它注入当前对话；若 run 已到尾声来不及注入，
     * 收尾阶段会把它链接成新的 run 继续执行。</p>
     */
    public StartResult startRun(String sessionKey, String message, String pageContext,
                                String locale, List<String> images, String agentId) {
        if (sessionKey == null || sessionKey.isEmpty()) {
            return StartResult.conflict("sessionKey is required");
        }
        if (message == null || message.trim().isEmpty()) {
            return StartResult.conflict("message is required");
        }

        RunHandle existing = runs.get(sessionKey);
        if (existing != null && !existing.isFinished()) {
            // steering：消息入库 + 进收件箱（turn 边界注入或收尾链接）
            conversationStore.saveMessage(sessionKey, "user", message, null, null, images);
            steeringInboxes.computeIfAbsent(sessionKey, k ->
                new cn.boommanpro.gaia.workflow.app.agent.core.SteeringInbox())
                .offer(new cn.boommanpro.gaia.workflow.app.agent.core.SteeringInbox.Message(
                    message, images, pageContext, locale, agentId));
            eventBus.publish(sessionKey, "steering_queued",
                new JSONObject().set("content", message).set("runId", existing.getRunId()));
            log.info("[session-run] steering queued session={} activeRun={}", sessionKey, existing.getRunId());
            return StartResult.accepted(sessionKey, existing.getRunId());
        }

        ensureSession(sessionKey, message);

        // 用户消息入库（含多模态图片）
        conversationStore.saveMessage(sessionKey, "user", message, null, null, images);

        startExecution(sessionKey, message, pageContext, locale,
            (agentId != null && !agentId.isEmpty()) ? agentId : resolveDefaultAgentId(), images, true);

        return StartResult.accepted(sessionKey, currentRunId(sessionKey));
    }

    /** 内部：把一次执行挂到线程池（persistedUserMessage 表示用户消息已入库，避免链接式重复落） */
    private void startExecution(String sessionKey, String message, String pageContext, String locale,
                                String agent, List<String> images, boolean persistedUserMessage) {
        String runId = UUID.randomUUID().toString().replace("-", "").substring(0, 12);
        RunHandle handle = new RunHandle(runId, sessionKey);
        runs.put(sessionKey, handle);

        JSONObject runningState = new JSONObject()
            .set("status", "running")
            .set("phase", "llm")
            .set("runId", runId)
            .set("sessionKey", sessionKey)
            .set("turn", 0)
            .set("assistantContent", "")
            .set("toolCalls", new cn.hutool.json.JSONArray());
        eventBus.setState(sessionKey, runningState);

        executor.execute(() -> runAsync(sessionKey, message, pageContext, locale, agent, handle, persistedUserMessage));
        log.info("[session-run] accepted session={} runId={} agent={} persistedUserMessage={}",
            sessionKey, runId, agent, persistedUserMessage);
    }

    private String currentRunId(String sessionKey) {
        RunHandle handle = runs.get(sessionKey);
        return handle != null ? handle.getRunId() : null;
    }

    /**
     * 请求未指定 Agent 时的默认选择（管理端「默认执行引擎」开关驱动，agent.engine.default）：
     * mode=ark 且方舟已配置（apiKey + environmentId）→ 方舟托管 Agent
     * （defaultAgentId 已填用之，否则内置 ark-assistant，首次运行自动同步创建远端资源）；
     * mode=as-service 且 Service 已配置（baseUrl + apiKey + adminPassword）→ as-service-assistant；
     * 其余情况 → local 默认 workspace-backend。读取失败一律回退，保证聊天永不被配置问题打挂。
     */
    private String resolveDefaultAgentId() {
        try {
            if ("ark".equals(providerConfigService.getDefaultEngineMode())
                && providerConfigService.isArkConfiguredForDefault()) {
                String defaultAgentId = providerConfigService.getArkConfig().getDefaultAgentId();
                return defaultAgentId != null && !defaultAgentId.isEmpty()
                    ? defaultAgentId : "ark-assistant";
            }
            if (AgentProviderConfigService.AS_SERVICE_ENGINE_MODE
                    .equals(providerConfigService.getDefaultEngineMode())
                && providerConfigService.isAsServiceConfiguredForDefault()) {
                return "as-service-assistant";
            }
        } catch (Exception e) {
            log.warn("[session-run] resolve default agent failed, fallback to {}: {}",
                DEFAULT_AGENT_ID, e.getMessage());
        }
        return DEFAULT_AGENT_ID;
    }

    /** 停止当前运行（尽力而为：标记取消，事件不再进总线；后台线程自然结束） */
    public void stop(String sessionKey) {
        if (sessionKey == null) {
            return;
        }
        RunHandle handle = runs.get(sessionKey);
        if (handle != null && !handle.isFinished()) {
            handle.cancel();
            eventBus.setState(sessionKey, new JSONObject()
                .set("status", "stopped")
                .set("phase", "stopped")
                .set("runId", handle.getRunId())
                .set("sessionKey", sessionKey));
            eventBus.publish(sessionKey, "done", new JSONObject().set("stopped", true));
            log.info("[session-run] stopped session={} runId={}", sessionKey, handle.getRunId());
        }
    }

    public boolean isRunning(String sessionKey) {
        RunHandle handle = runs.get(sessionKey);
        return handle != null && !handle.isFinished();
    }

    // ---------------- 订阅 / 状态 ----------------

    /** 订阅会话事件流（SSE 用），返回取消句柄 */
    public Runnable subscribe(String sessionKey, SseEmitter emitter) {
        // 僵尸快照归位：进程重启 / 线程被杀等情况下 latestState 可能停留在 "running"，
        // 回放给新订阅窗口会被当成 live 消息，把旧 token 流（含模型回显的工具输出）
        // 整段注入对话框。凡是没有活跃 run 却自称 running 的，一律改写为 idle 再回放。
        JSONObject stale = eventBus.getState(sessionKey);
        if ("running".equals(stale.getStr("status")) && !isRunning(sessionKey)) {
            stale.set("status", "idle").set("phase", "idle");
            eventBus.setState(sessionKey, stale);
        }
        return eventBus.subscribe(sessionKey, (type, data) -> {
            try {
                emitter.send(SseEmitter.event().name(type).data(data.toString()));
                return true;
            } catch (Exception e) {
                return false; // 连接断开，总线会移除该订阅者
            }
        });
    }

    /** 当前运行快照（轮询兜底 / 初始渲染用） */
    public JSONObject getStatus(String sessionKey) {
        JSONObject state = eventBus.getState(sessionKey);
        if (state != null && state.containsKey("status")) {
            return state;
        }
        return new JSONObject().set("status", "idle");
    }

    // ---------------- 内部 ----------------

    /** run 工具的 target 缺省即 workflow；args_digest 是原始参数 JSON（超长截断，截断后按非整流处理） */
    private static boolean isWorkflowRun(String argsDigest) {
        if (argsDigest == null || argsDigest.trim().isEmpty()) {
            return true;
        }
        try {
            String target = cn.hutool.json.JSONUtil.parseObj(argsDigest).getStr("target");
            return target == null || "workflow".equals(target);
        } catch (Exception e) {
            return false;
        }
    }

    /** 把 run 失败原因持久化为 assistant 消息，保证切走/刷新后用户仍能看到失败原因 */
    private void persistRunError(String sessionKey, String errorText) {
        try {
            conversationStore.saveMessage(sessionKey, "assistant",
                "⚠️ 本次执行失败：" + errorText, null, null);
        } catch (Exception e) {
            log.warn("[session-run] persist run error failed session={}: {}", sessionKey, e.getMessage());
        }
    }

    private void runAsync(String sessionKey, String message, String pageContext, String locale,
                          String agentId, RunHandle handle) {
        runAsync(sessionKey, message, pageContext, locale, agentId, handle, true);
    }

    private void runAsync(String sessionKey, String message, String pageContext, String locale,
                          String agentId, RunHandle handle, boolean persistedUserMessage) {
        // 调用日志录制器：旁路记录 llm_end / tool_call / tool_result，结束后并入 debug_data（会话审查数据源）
        ToolLogRecorder recorder = new ToolLogRecorder(
            new BusAgentEventSink(sessionKey, eventBus, handle), sessionService,
            sessionEventService, handle.getRunId(), sessionKey, message);
        AgentRunResult result = null;
        // run_end 是否已发（正常路径在 done 之前先发；finally 兜底 stop/异常路径）
        boolean runEndEmitted = false;
        try {
            // run 的触发输入随事件流落库（TrajectoryPanel 据此渲染用户输入行，
            // 「任务输入（完整提示词）」与任务名回退；SSE 侧前端不认识该事件，自然忽略）
            recorder.emit(cn.boommanpro.gaia.workflow.app.agent.event.AgentEvent.of(
                "run_input", new JSONObject().set("content", message)));
            AgentRequest request = new AgentRequest(
                sessionKey, message, locale != null ? locale : "zh-CN", pageContext,
                agentId, ToolExecutionMode.BACKEND, null, handle.getRunId());
            if (request.getVariables() == null) {
                request.setVariables(new java.util.HashMap<>());
            }
            // 协作式中断：主循环在轮边界/工具前后/重试等待轮询本句柄
            request.getVariables().put("interrupt", (java.util.function.BooleanSupplier) handle::isCancelled);
            // steering 收件箱（会话级）：turn 边界注入；收尾残留由此处的链接逻辑消费
            request.getVariables().put("steeringInbox",
                steeringInboxes.computeIfAbsent(sessionKey, k ->
                    new cn.boommanpro.gaia.workflow.app.agent.core.SteeringInbox()));
            request.getVariables().put("persistedUserMessage", persistedUserMessage);

        AgentEventSink sink = recorder;
        // 跨 run 压缩闭环（对标 dsh compaction-basic 的 pre-run 触发位）：历史压力过阈值时
        // 先摘要再推理。压缩本身会调一次 LLM（阻塞在此线程，run 线程无碍）；结果外发
        // compaction 事件让前端播报「已压缩历史」——压缩必须可见，不能只默默变短。
        try {
            JSONObject compactResult = compactionService.compact(sessionKey);
            if (Boolean.TRUE.equals(compactResult.getBool("compacted"))) {
                recorder.emit(cn.boommanpro.gaia.workflow.app.agent.event.AgentEvent.of("compaction",
                    compactResult.set("kind", "summary")));
            }
        } catch (Exception e) {
            log.debug("[session-run] pre-run compaction failed (ignored): {}", e.getMessage());
        }
        result = executionRouter.run(request, sink);

            if (!handle.isCancelled()) {
                if (result.isError()) {
                    String errorText = result.getErrorMessage() != null ? result.getErrorMessage() : "未知错误";
                    // 失败要落消息：否则用户切走再回来/刷新后，失败原因凭空消失，界面只剩沉默
                    persistRunError(sessionKey, errorText);
                    eventBus.publish(sessionKey, "error",
                        new JSONObject().set("message", errorText));
                }
                // 假绿裁定（owb task-verdict 思想）：改了工作流草稿却从未成功试运行 = 未经验证的交付。
                // 不阻断收尾（那会死循环），但显式警告 + 归因链标记，用户和下一轮模型都看得见。
                try {
                    java.util.List<cn.boommanpro.gaia.workflow.infra.manage.entity.AgentToolCallLog> calls =
                        toolCallLogService.list(new QueryWrapper<cn.boommanpro.gaia.workflow.infra.manage.entity.AgentToolCallLog>()
                            .eq("run_id", handle.getRunId()));
                    boolean mutated = calls.stream().anyMatch(c ->
                        ("node".equals(c.getToolName()) || "edge".equals(c.getToolName()))
                            && "SUCCESS".equals(c.getOutcome()));
                    boolean runVerified = calls.stream().anyMatch(c ->
                        "run".equals(c.getToolName()) && "SUCCESS".equals(c.getOutcome())
                            && isWorkflowRun(c.getArgsDigest()));
                    if (mutated && !runVerified) {
                        String warn = "本轮修改了工作流草稿，但没有成功整流验证过——交付未经验证。"
                            + "请先 run(target=workflow) 验证（正反两组输入），验证通过后提醒用户「保存为版本」。";
                        eventBus.publish(sessionKey, "delivery_warning",
                            new JSONObject().set("message", warn));
                        if (result != null && result.getFailureChain() != null) {
                            result.getFailureChain().add("unverified_delivery");
                        }
                        log.warn("[session-run] unverified delivery session={} (mutated without successful run)", sessionKey);
                    }
                } catch (Exception ex) {
                    log.debug("[session-run] delivery check skipped: {}", ex.getMessage());
                }

                // run_end 必须先于 done 到达：前端 onRunEnd（时间账小结卡）若晚于 onDone
                // （settleRun 摘 live 行），小结卡会插进不再渲染的时间线——正常路径在此先发
                runEndEmitted = emitRunEnd(sessionKey, handle, result, recorder);
                eventBus.publish(sessionKey, "done",
                    new JSONObject()
                        .set("turns", result.getTurns())
                        .set("abortedByTurnLimit", result.isAbortedByTurnLimit())
                        .set("interrupted", result.isInterrupted()));
            }
        } catch (Exception e) {
            log.error("[session-run] run failed session={} runId={}", sessionKey, handle.getRunId(), e);
            if (!handle.isCancelled()) {
                String errorText = e.getMessage() != null ? e.getMessage() : "运行异常";
                persistRunError(sessionKey, errorText);
                eventBus.publish(sessionKey, "error",
                    new JSONObject().set("message", errorText));
            }
        } finally {
            // run_end 终态事件（dsh 崩溃恢复依赖）：先落日志再收尾，
            // 启动归位组件据此区分「正常结束」与「进程死亡时仍在跑」。
            // 正常路径已在 done 前发过；这里兜底覆盖 stop/异常路径（此时 done 已发，尽力补记）。
            if (!runEndEmitted) {
                emitRunEnd(sessionKey, handle, result, recorder);
            }
            recorder.flush(sessionKey);
            // 交错时间线持久化（对标 dsh「快照即结构」）：把本次 run 的真实调用链路
            // （思考 → 工具 → 思考 → … → 正文）附到本 run 的 assistant 行上 ——
            // 刷新后前端按原样还原，不再退化成「合并思考+合并正文+工具链」。
            // 取自事件总线快照，引擎无关（local/ark 通用）。
            try {
                cn.hutool.json.JSONArray timeline = eventBus.getState(sessionKey).getJSONArray("timeline");
                if (timeline != null && !timeline.isEmpty()) {
                    conversationStore.attachTimelineToLastAssistant(sessionKey,
                        capTimelineForPersist(timeline).toString());
                }
            } catch (Exception e) {
                log.debug("[session-run] attach timeline failed session={}: {}", sessionKey, e.getMessage());
            }
            // 兜底收尾：任何路径离开 run 都不允许快照停留在 running，
            // 否则重启前订阅的新窗口会回放到僵尸 running 并注入旧内容
            JSONObject state = eventBus.getState(sessionKey);
            if ("running".equals(state.getStr("status"))) {
                state.set("status", handle.isCancelled() ? "stopped" : "done").set("phase", "done");
                eventBus.setState(sessionKey, state);
            }
            handle.markFinished();
            runs.remove(sessionKey, handle);
            // steering 链接：run 结束时收件箱里还有消息（到达太晚没赶上 turn 边界），
            // 不丢给用户一个「已发送但没人处理」的沉默——链接成新 run 继续执行
            chainSteering(sessionKey);
        }
    }

    /**
     * run_end 终态事件（SSE 与事件表各得一份）：结构化归因（失败链/时间账/token）——
     * 调试面板归因卡、对话页 run 小结卡（token 用量）与执行追踪页的数据源。
     *
     * @return 是否成功发出（失败只记 debug，不影响主链路）
     */
    private boolean emitRunEnd(String sessionKey, RunHandle handle, AgentRunResult result,
                               ToolLogRecorder recorder) {
        try {
            String outcome = handle.isCancelled() ? "stopped"
                : (result != null && result.isError() ? "error" : "done");
            JSONObject runEnd = new JSONObject()
                .set("outcome", outcome)
                .set("turns", result != null ? result.getTurns() : 0);
            if (result != null) {
                runEnd.set("engine", result.getEngine())
                    .set("durationMs", result.getDurationMs())
                    .set("toolTimeMs", result.getToolTimeMs())
                    .set("promptTokens", result.getPromptTokens())
                    .set("completionTokens", result.getCompletionTokens())
                    .set("llmRetries", result.getLlmRetries());
                if (result.getFailureChain() != null && !result.getFailureChain().isEmpty()) {
                    cn.hutool.json.JSONArray chain = new cn.hutool.json.JSONArray();
                    for (String item : result.getFailureChain()) {
                        chain.add(item);
                    }
                    runEnd.set("failureChain", chain);
                }
            }
            recorder.emit(cn.boommanpro.gaia.workflow.app.agent.event.AgentEvent.of("run_end", runEnd));
            return true;
        } catch (Exception e) {
            log.debug("[session-run] run_end emit failed: {}", e.getMessage());
            return false;
        }
    }

    /** 持久化时间线里单个工具结果/入参的截断上限（时间线只服务展示，明细以工具日志/追踪为准） */
    private static final int TIMELINE_FIELD_CAP = 6000;

    /**
     * 时间线深拷贝 + 大字段截断：时间线里的工具条目与事件总线快照共享引用，
     * 直接截断会污染快照本体；args/result 超限截断加省略号标记。
     */
    private static cn.hutool.json.JSONArray capTimelineForPersist(cn.hutool.json.JSONArray timeline) {
        cn.hutool.json.JSONArray out = new cn.hutool.json.JSONArray();
        for (Object item : timeline) {
            if (!(item instanceof JSONObject)) {
                continue;
            }
            JSONObject entry = cn.hutool.json.JSONUtil.parseObj(item);
            JSONObject call = entry.getJSONObject("call");
            if (call != null) {
                capTimelineField(call, "result");
                capTimelineField(call, "args");
            }
            out.add(entry);
        }
        return out;
    }

    /** 把 call 内指定字符串字段截断到上限（非字符串或超限 JSON 化后截断） */
    private static void capTimelineField(JSONObject call, String field) {
        Object value = call.get(field);
        if (value == null) {
            return;
        }
        String text = value instanceof String ? (String) value : value.toString();
        if (text.length() > TIMELINE_FIELD_CAP) {
            call.set(field, text.substring(0, TIMELINE_FIELD_CAP) + "…[已截断，明细见执行追踪]");
        }
    }

    /** 把收件箱残留消息链接成新 run（消息已入库，跳过重复持久化；后续消息由链接链继续处理） */
    private void chainSteering(String sessionKey) {        if (handleIsActive(sessionKey)) {
            return; // 新 run 已经抢先注册（极端竞态），收件箱归它消费
        }
        cn.boommanpro.gaia.workflow.app.agent.core.SteeringInbox inbox = steeringInboxes.get(sessionKey);
        if (inbox == null) {
            return;
        }
        java.util.List<cn.boommanpro.gaia.workflow.app.agent.core.SteeringInbox.Message> remaining = inbox.drain();
        if (remaining.isEmpty()) {
            steeringInboxes.remove(sessionKey, inbox);
            return;
        }
        cn.boommanpro.gaia.workflow.app.agent.core.SteeringInbox.Message next = remaining.remove(0);
        // 更晚到达的消息回填：链接 run 的收尾会再次进入这里，逐条顺序执行
        for (cn.boommanpro.gaia.workflow.app.agent.core.SteeringInbox.Message m : remaining) {
            inbox.offer(m);
        }
        String agent = next.agentId != null && !next.agentId.isEmpty()
            ? next.agentId : resolveDefaultAgentId();
        log.info("[session-run] chaining steering message session={}: {}", sessionKey, next.content);
        startExecution(sessionKey, next.content, next.pageContext, next.locale, agent, next.images, false);
    }

    private boolean handleIsActive(String sessionKey) {
        RunHandle handle = runs.get(sessionKey);
        return handle != null && !handle.isFinished();
    }

    /** 会话不存在时自动创建（标题取首条消息前 30 字），保证 run 总能落库 */
    private void ensureSession(String sessionKey, String message) {
        try {
            Long count = sessionService.count(
                new QueryWrapper<AgentSession>().eq("session_key", sessionKey));
            if (count != null && count > 0) {
                return;
            }
            AgentSession session = new AgentSession();
            session.setSessionKey(sessionKey);
            String title = message != null ? message.trim().replaceAll("\\s+", " ") : "";
            session.setTitle(title.length() > 30 ? title.substring(0, 30) : (title.isEmpty() ? "新对话" : title));
            session.setScope("chat");
            session.setEngine("agentscope");
            session.setPinned(0);
            session.setArchived(0);
            session.setCreatedAt(LocalDateTime.now());
            session.setUpdatedAt(LocalDateTime.now());
            sessionService.save(session);
            log.info("[session-run] auto-created session {} for run", sessionKey);
        } catch (Exception e) {
            log.warn("[session-run] ensureSession failed for {}: {}", sessionKey, e.getMessage());
        }
    }
}
