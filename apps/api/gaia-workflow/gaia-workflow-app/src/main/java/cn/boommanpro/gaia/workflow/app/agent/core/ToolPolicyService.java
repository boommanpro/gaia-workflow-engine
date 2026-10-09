package cn.boommanpro.gaia.workflow.app.agent.core;

import cn.boommanpro.gaia.workflow.app.agent.event.AgentEvent;
import cn.boommanpro.gaia.workflow.app.agent.event.AgentEventSink;
import cn.boommanpro.gaia.workflow.app.agent.llm.LlmToolCall;
import cn.boommanpro.gaia.workflow.app.agent.session.SessionEventBus;
import cn.boommanpro.gaia.workflow.app.service.AgentToolRegistry;
import cn.boommanpro.gaia.workflow.infra.manage.entity.AgentConfig;
import cn.boommanpro.gaia.workflow.infra.manage.entity.AgentGlobalPermission;
import cn.boommanpro.gaia.workflow.infra.manage.entity.AgentPermission;
import cn.boommanpro.gaia.workflow.infra.manage.service.AgentConfigService;
import cn.boommanpro.gaia.workflow.infra.manage.service.AgentGlobalPermissionService;
import cn.boommanpro.gaia.workflow.infra.manage.service.AgentPermissionService;
import cn.hutool.json.JSONObject;
import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;

/**
 * 工具调用策略门禁 —— 把权限体系从「前端执行」搬回「后端执行」。
 *
 * <p>旧架构里后端只把 policy 塞进 tool_call 事件，由前端决定 confirm/forbid；
 * 后端自治模式下前端不在场，权限形同虚设（forbid 照样执行、confirm 静默跳过）。
 * 这里在 {@code AgentRuntime} 执行工具前统一裁决：</p>
 * <ul>
 *   <li><b>forbid</b> → 拒绝，注入 rejected 的 tool 消息（模型下轮换路）</li>
 *   <li><b>confirm</b> → 按配置 {@code agent.policy.confirm_mode} 决策：
 *     <ul>
 *       <li>{@code auto-approve}（默认）：无窗口/有窗口一律自动放行，广播 confirm_request(decision=approved)</li>
 *       <li>{@code auto-reject}：一律拒绝</li>
 *       <li>{@code require}：会话有在线窗口时挂起等待任一窗口确认；无窗口时自动放行（保「关窗继续」）</li>
 *     </ul>
 *   </li>
 *   <li><b>always</b> → 直接执行</li>
 * </ul>
 *
 * <p>策略解析优先级：会话级 {@code agent_permission} > 全局 {@code agent_global_permission} >
 * 工具注册默认策略。</p>
 */
@Slf4j
@Component
public class ToolPolicyService {

    /** 确认模式配置 key（agent_config 表，config_type=agent_policy） */
    public static final String CONFIRM_MODE_KEY = "agent.policy.confirm_mode";

    /**
     * applyWorkflow 专用确认模式 key（设计文档 agent-artifact-design.md D1）。
     * 落版是人机交接点：默认 require（用户确认后才写 gaia_workflow_version），
     * 管理端配置中心可切 auto-approve / auto-reject。独立于全局 confirm_mode。
     */
    public static final String APPLY_CONFIRM_MODE_KEY = "agent.policy.apply_confirm_mode";

    /** confirm require 模式下的等待上限 */
    private static final long CONFIRM_TIMEOUT_SECONDS = 300;

    /** 等待确认期间的心跳间隔（秒）：保活 SSE + 窗口丢卡后重新弹出 */
    private static final long CONFIRM_HEARTBEAT_SECONDS = 20;

    private final AgentPermissionService permissionService;
    private final AgentGlobalPermissionService globalPermissionService;
    private final AgentToolRegistry toolRegistry;
    private final AgentConfigService configService;
    private final SessionEventBus eventBus;

    /** 确认心跳调度器（daemon，不阻塞 JVM 退出） */
    private final java.util.concurrent.ScheduledExecutorService confirmHeartbeat =
        java.util.concurrent.Executors.newSingleThreadScheduledExecutor(r -> {
            Thread t = new Thread(r, "confirm-heartbeat");
            t.setDaemon(true);
            return t;
        });

    /** sessionKey#toolCallId → 等待用户确认的 future（仅 require 模式使用） */
    private final ConcurrentMap<String, CompletableFuture<Boolean>> pendingConfirms = new ConcurrentHashMap<>();

    public ToolPolicyService(AgentPermissionService permissionService,
                             AgentGlobalPermissionService globalPermissionService,
                             AgentToolRegistry toolRegistry,
                             AgentConfigService configService,
                             SessionEventBus eventBus) {
        this.permissionService = permissionService;
        this.globalPermissionService = globalPermissionService;
        this.toolRegistry = toolRegistry;
        this.configService = configService;
        this.eventBus = eventBus;
    }

    // ---------------- 对外 API ----------------

    /** 解析某个动作的策略（会话级 > 全局 > 工具默认） */
    public String resolvePolicy(String sessionKey, String action) {
        if (sessionKey != null) {
            AgentPermission perm = permissionService.getOne(
                new QueryWrapper<AgentPermission>()
                    .eq("session_key", sessionKey)
                    .eq("action", action));
            if (perm != null && perm.getPolicy() != null) {
                return perm.getPolicy();
            }
        }
        AgentGlobalPermission global = globalPermissionService.getOne(
            new QueryWrapper<AgentGlobalPermission>().eq("action", action));
        if (global != null && global.getPolicy() != null) {
            return global.getPolicy();
        }
        return toolRegistry.getDefaultPolicy(action);
    }

    /**
     * confirm 策略的决策入口（在 AgentRuntime 执行工具前调用）。
     *
     * @return true 放行执行，false 拒绝
     */
    public boolean decideConfirm(AgentRunContext context, LlmToolCall call, AgentEventSink sink) {
        String sessionKey = context.getSessionKey();
        String mode = confirmModeFor(call.getName());
        String toolCallId = call.getId();
        log.info("[tool-policy] decide session={} tool={} mode={} subscribers={}",
            sessionKey, call.getName(), mode, eventBus.hasSubscribers(sessionKey));

        // require + 有窗口在线 → 挂起等待任一窗口确认
        if ("require".equals(mode) && eventBus.hasSubscribers(sessionKey)) {
            CompletableFuture<Boolean> future = new CompletableFuture<>();
            pendingConfirms.put(key(sessionKey, toolCallId), future);
            JSONObject request = new JSONObject()
                .set("toolCallId", toolCallId)
                .set("action", call.getName())
                .set("args", parseArgs(call.getArguments()))
                .set("mode", "require");
            sink.emit(AgentEvent.of("confirm_request", request));
            // 等待期间周期性重发确认请求：一是给 SSE 链路保活（空闲连接可能被
            // 代理掐断），二是窗口意外丢卡（组件重挂载/重连窗口）时能重新弹出。
            java.util.concurrent.ScheduledFuture<?> heartbeat = confirmHeartbeat.scheduleAtFixedRate(
                () -> {
                    if (future.isDone()) {
                        return;
                    }
                    try {
                        sink.emit(AgentEvent.of("confirm_request", request));
                    } catch (Exception e) {
                        log.debug("[tool-policy] confirm heartbeat failed: {}", e.getMessage());
                    }
                },
                CONFIRM_HEARTBEAT_SECONDS, CONFIRM_HEARTBEAT_SECONDS, TimeUnit.SECONDS);
            try {
                boolean approved = future.get(CONFIRM_TIMEOUT_SECONDS, TimeUnit.SECONDS);
                log.info("[tool-policy] session={} tool={} confirm require resolved={}",
                    sessionKey, call.getName(), approved);
                // 决议结果广播出去，所有窗口据此摘掉确认卡（快照同步清空）
                sink.emit(AgentEvent.of("confirm_resolved", new JSONObject()
                    .set("toolCallId", toolCallId)
                    .set("approved", approved)));
                return approved;
            } catch (TimeoutException te) {
                log.warn("[tool-policy] session={} tool={} confirm timed out, auto-reject",
                    sessionKey, call.getName());
                sink.emit(AgentEvent.of("confirm_resolved", new JSONObject()
                    .set("toolCallId", toolCallId)
                    .set("approved", false)
                    .set("reason", "timeout")));
                return false;
            } catch (Exception e) {
                log.warn("[tool-policy] session={} confirm wait failed: {}", sessionKey, e.getMessage());
                sink.emit(AgentEvent.of("confirm_resolved", new JSONObject()
                    .set("toolCallId", toolCallId)
                    .set("approved", false)
                    .set("reason", "error")));
                return false;
            } finally {
                heartbeat.cancel(false);
                pendingConfirms.remove(key(sessionKey, toolCallId));
            }
        }

        // auto-approve / auto-reject（require 但无窗口 → 自动放行，保「关窗继续」）
        boolean approved = !"auto-reject".equals(mode);
        sink.emit(AgentEvent.of("confirm_request", new JSONObject()
            .set("toolCallId", toolCallId)
            .set("action", call.getName())
            .set("args", parseArgs(call.getArguments()))
            .set("mode", mode)
            .set("decision", approved ? "approved" : "rejected")));
        sink.emit(AgentEvent.of("confirm_resolved", new JSONObject()
            .set("toolCallId", toolCallId)
            .set("approved", approved)));
        return approved;
    }

    /** 供确认接口回调：完成 require 模式的等待 */
    public void resolve(String sessionKey, String toolCallId, boolean approved) {
        CompletableFuture<Boolean> future = pendingConfirms.get(key(sessionKey, toolCallId));
        if (future != null) {
            future.complete(approved);
            log.info("[tool-policy] session={} toolCall={} resolved={}", sessionKey, toolCallId, approved);
        } else {
            log.warn("[tool-policy] no pending confirm for session={} toolCall={}", sessionKey, toolCallId);
        }
    }

    // ---------------- 内部 ----------------

    /** 确认模式裁决：applyWorkflow 走专用 key（默认 require），其余工具走全局 confirm_mode */
    private String confirmModeFor(String action) {
        if ("applyWorkflow".equals(action)) {
            String mode = readModeConfig(APPLY_CONFIRM_MODE_KEY);
            return mode != null ? mode : "require";
        }
        String mode = readModeConfig(CONFIRM_MODE_KEY);
        return mode != null ? mode : "auto-approve";
    }

    /** 读取模式配置，非法值返回 null（由调用方决定默认） */
    private String readModeConfig(String configKey) {
        try {
            AgentConfig config = configService.getOne(
                new QueryWrapper<AgentConfig>().eq("config_key", configKey).last("LIMIT 1"));
            if (config != null && config.getContent() != null && !config.getContent().trim().isEmpty()) {
                String mode = config.getContent().trim();
                if ("auto-approve".equals(mode) || "auto-reject".equals(mode) || "require".equals(mode)) {
                    return mode;
                }
            }
        } catch (Exception e) {
            log.warn("[tool-policy] read config {} failed: {}", configKey, e.getMessage());
        }
        return null;
    }

    private static String key(String sessionKey, String toolCallId) {
        return sessionKey + "#" + toolCallId;
    }

    private static JSONObject parseArgs(String raw) {
        if (raw == null || raw.trim().isEmpty()) {
            return new JSONObject();
        }
        try {
            return cn.hutool.json.JSONUtil.parseObj(raw);
        } catch (Exception e) {
            return new JSONObject().set("_raw", raw);
        }
    }
}
