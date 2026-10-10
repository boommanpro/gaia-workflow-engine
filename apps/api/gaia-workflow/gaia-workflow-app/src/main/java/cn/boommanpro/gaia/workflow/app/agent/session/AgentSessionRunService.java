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
    private final AgentProviderConfigService providerConfigService;
    private final cn.boommanpro.gaia.workflow.app.agent.core.ToolPolicyService toolPolicyService;
    private final cn.boommanpro.gaia.workflow.infra.manage.service.AgentSessionEventService sessionEventService;

    private final ConcurrentMap<String, RunHandle> runs = new ConcurrentHashMap<>();

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
                                  cn.boommanpro.gaia.workflow.app.agent.core.ToolPolicyService toolPolicyService,
                                  cn.boommanpro.gaia.workflow.infra.manage.service.AgentSessionEventService sessionEventService) {
        this.executionRouter = executionRouter;
        this.eventBus = eventBus;
        this.conversationStore = conversationStore;
        this.sessionService = sessionService;
        this.providerConfigService = providerConfigService;
        this.toolPolicyService = toolPolicyService;
        this.sessionEventService = sessionEventService;
    }

    @PreDestroy
    public void destroy() {
        executor.shutdown();
    }

    // ---------------- 运行入口 ----------------

    /**
     * 在指定会话上异步启动一次后端自治运行。
     * 立即返回受理结果；运行在后台线程推进，事件进会话事件总线。
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
            return StartResult.conflict("该会话正在执行中，请等待完成或先停止");
        }

        ensureSession(sessionKey, message);

        // 用户消息入库（含多模态图片）
        conversationStore.saveMessage(sessionKey, "user", message, null, null, images);

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

        final String agent = (agentId != null && !agentId.isEmpty()) ? agentId : resolveDefaultAgentId();
        executor.execute(() -> runAsync(sessionKey, message, pageContext, locale, agent, handle));

        log.info("[session-run] accepted session={} runId={} agent={}", sessionKey, runId, agent);
        return StartResult.accepted(sessionKey, runId);
    }

    /**
     * 请求未指定 Agent 时的默认选择（管理端「默认执行引擎」开关驱动，agent.engine.default）：
     * mode=ark 且方舟已配置（apiKey + environmentId）→ 方舟托管 Agent
     * （defaultAgentId 已填用之，否则内置 ark-assistant，首次运行自动同步创建远端资源）；
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
        // 调用日志录制器：旁路记录 llm_end / tool_call / tool_result，结束后并入 debug_data（会话审查数据源）
        ToolLogRecorder recorder = new ToolLogRecorder(
            new BusAgentEventSink(sessionKey, eventBus, handle), sessionService,
            sessionEventService, handle.getRunId(), sessionKey, message);
        try {
            AgentRequest request = new AgentRequest(
                sessionKey, message, locale != null ? locale : "zh-CN", pageContext,
                agentId, ToolExecutionMode.BACKEND, 0, null, handle.getRunId());
            AgentEventSink sink = recorder;
            AgentRunResult result = executionRouter.run(request, sink);

            if (!handle.isCancelled()) {
                if (result.isError()) {
                    String errorText = result.getErrorMessage() != null ? result.getErrorMessage() : "未知错误";
                    // 失败要落消息：否则用户切走再回来/刷新后，失败原因凭空消失，界面只剩沉默
                    persistRunError(sessionKey, errorText);
                    eventBus.publish(sessionKey, "error",
                        new JSONObject().set("message", errorText));
                }
                eventBus.publish(sessionKey, "done",
                    new JSONObject()
                        .set("turns", result.getTurns())
                        .set("abortedByTurnLimit", result.isAbortedByTurnLimit()));
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
            recorder.flush(sessionKey);
            // 运行收尾：放弃本会话仍挂起的确认等待（turn-limit 截断/异常路径的确认卡不该悬到 300s 超时）
            try {
                toolPolicyService.cancelPendingConfirms(sessionKey);
            } catch (Exception e) {
                log.warn("[session-run] cancel pending confirms failed session={}: {}", sessionKey, e.getMessage());
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
        }
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
