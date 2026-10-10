package cn.boommanpro.gaia.workflow.app.controller.api;

import cn.boommanpro.gaia.workflow.app.agent.core.ToolPolicyService;
import cn.boommanpro.gaia.workflow.app.agent.session.AgentSessionRunService;
import cn.boommanpro.gaia.workflow.app.agent.session.SessionArtifactStore;
import cn.boommanpro.gaia.workflow.app.agent.session.SessionEventBus;
import cn.boommanpro.gaia.workflow.app.agent.session.SessionWorkflowDraftService;
import cn.boommanpro.gaia.workflow.infra.manage.entity.GaiaWorkflow;
import cn.boommanpro.gaia.workflow.infra.manage.entity.GaiaWorkflowVersion;
import cn.boommanpro.gaia.workflow.infra.manage.service.GaiaWorkflowService;
import cn.boommanpro.gaia.workflow.infra.manage.service.GaiaWorkflowVersionService;
import cn.hutool.json.JSONObject;
import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicReference;

/**
 * 会话级后端自治运行的对外接口 —— 「纯后端、多窗口、关窗继续」的 HTTP 面。
 *
 * <pre>
 *  POST /api/agent/session/{key}/run       触发一次后端自治运行（异步受理，立即返回）
 *  GET  /api/agent/session/{key}/events    订阅会话事件流（SSE，含断线回放）
 *  GET  /api/agent/session/{key}/status    当前运行快照（轮询兜底）
 *  POST /api/agent/session/{key}/stop      停止当前运行
 *  GET  /api/agent/session/{key}/document  当前服务端画布草稿
 *  GET  /api/agent/session/{key}/artifacts 会话产物列表（workflow/plan/test_report/release）
 * </pre>
 */
@Slf4j
@RestController
@RequestMapping("/api/agent/session")
public class AgentSessionRunController {

    private final AgentSessionRunService runService;
    private final SessionWorkflowDraftService draftService;
    private final ToolPolicyService toolPolicyService;
    private final SessionArtifactStore artifactStore;
    private final GaiaWorkflowService workflowService;
    private final GaiaWorkflowVersionService workflowVersionService;
    private final SessionEventBus eventBus;

    public AgentSessionRunController(AgentSessionRunService runService,
                                     SessionWorkflowDraftService draftService,
                                     ToolPolicyService toolPolicyService,
                                     SessionArtifactStore artifactStore,
                                     GaiaWorkflowService workflowService,
                                     GaiaWorkflowVersionService workflowVersionService,
                                     SessionEventBus eventBus) {
        this.runService = runService;
        this.draftService = draftService;
        this.toolPolicyService = toolPolicyService;
        this.artifactStore = artifactStore;
        this.workflowService = workflowService;
        this.workflowVersionService = workflowVersionService;
        this.eventBus = eventBus;
    }

    /** 触发一次后端自治运行 */
    @PostMapping("/{sessionKey}/run")
    public Map<String, Object> run(@PathVariable String sessionKey,
                                   @RequestBody(required = false) Map<String, Object> body) {
        if (body == null) {
            body = new java.util.HashMap<>();
        }
        String message = body.get("message") != null ? String.valueOf(body.get("message")) : null;
        String pageContext = body.get("pageContext") != null ? String.valueOf(body.get("pageContext")) : null;
        String locale = body.get("locale") != null ? String.valueOf(body.get("locale")) : "zh-CN";
        String agentId = body.get("agentId") != null ? String.valueOf(body.get("agentId")) : null;

        List<String> images = null;
        if (body.get("images") instanceof List) {
            @SuppressWarnings("unchecked")
            List<Object> rawImages = (List<Object>) body.get("images");
            images = new ArrayList<>();
            for (Object img : rawImages) {
                if (img != null) {
                    images.add(String.valueOf(img));
                }
            }
        }

        AgentSessionRunService.StartResult result =
            runService.startRun(sessionKey, message, pageContext, locale, images, agentId);
        return result.toJson();
    }

    /** 订阅会话事件流（SSE，支持断线重连回放） */
    @GetMapping("/{sessionKey}/events")
    public SseEmitter events(@PathVariable String sessionKey) {
        SseEmitter emitter = new SseEmitter(0L);
        AtomicReference<Runnable> unsubscribeRef = new AtomicReference<>(() -> { });
        emitter.onCompletion(() -> {
            Runnable unsub = unsubscribeRef.get();
            if (unsub != null) {
                unsub.run();
            }
        });
        emitter.onTimeout(() -> {
            Runnable unsub = unsubscribeRef.get();
            if (unsub != null) {
                unsub.run();
            }
        });
        // 立即返回订阅句柄，后续事件经总线推给该 emitter
        Runnable unsubscribe = runService.subscribe(sessionKey, emitter);
        unsubscribeRef.set(unsubscribe);
        log.debug("[session-run] subscribe events: {}", sessionKey);
        return emitter;
    }

    /**
     * 当前挂起的确认（require 模式）：页面刷新/重连后前端立即恢复确认卡，
     * 不依赖 20s 心跳重发。无挂起返回 {pending: false}。
     */
    @GetMapping("/{sessionKey}/pending-confirm")
    public Map<String, Object> pendingConfirm(@PathVariable String sessionKey) {
        JSONObject pending = toolPolicyService.getPendingConfirm(sessionKey);
        if (pending == null) {
            return new JSONObject().set("pending", false);
        }
        return new JSONObject()
            .set("pending", true)
            .set("toolCallId", pending.getStr("toolCallId"))
            .set("action", pending.getStr("action"))
            .set("args", pending.getJSONObject("args"));
    }

    /** 当前运行快照 */
    @GetMapping("/{sessionKey}/status")
    public Map<String, Object> status(@PathVariable String sessionKey) {
        JSONObject state = runService.getStatus(sessionKey);
        return state;
    }

    /** 停止当前运行 */
    @PostMapping("/{sessionKey}/stop")
    public Map<String, Object> stop(@PathVariable String sessionKey) {
        runService.stop(sessionKey);
        JSONObject result = new JSONObject().set("success", true);
        return result;
    }

    /**
     * 确认 / 拒绝一次等待中的工具调用（confirm require 模式）。
     * body: { "toolCallId": "...", "approved": true }
     */
    @PostMapping("/{sessionKey}/confirm")
    public Map<String, Object> confirm(@PathVariable String sessionKey,
                                       @RequestBody Map<String, Object> body) {
        String toolCallId = body != null && body.get("toolCallId") != null
            ? String.valueOf(body.get("toolCallId")) : null;
        boolean approved = body != null && Boolean.TRUE.equals(body.get("approved"));
        if (toolCallId == null || toolCallId.isEmpty()) {
            return new JSONObject().set("success", false).set("error", "toolCallId is required");
        }
        toolPolicyService.resolve(sessionKey, toolCallId, approved);
        return new JSONObject()
            .set("success", true)
            .set("toolCallId", toolCallId)
            .set("approved", approved);
    }

    /** 当前服务端画布草稿 */
    @GetMapping("/{sessionKey}/document")
    public Map<String, Object> document(@PathVariable String sessionKey) {
        JSONObject doc = draftService.get(sessionKey);
        return doc;
    }

    /** 会话产物列表（会话打开时加载，驱动产物面板与历史卡片） */
    @GetMapping("/{sessionKey}/artifacts")
    public List<Map<String, Object>> artifacts(@PathVariable String sessionKey) {
        List<Map<String, Object>> result = new ArrayList<>();
        for (cn.boommanpro.gaia.workflow.infra.manage.entity.AgentArtifact artifact
            : artifactStore.listBySession(sessionKey)) {
            JSONObject json = SessionArtifactStore.toPublicJson(artifact);
            result.add(json);
        }
        return result;
    }

    /**
     * 基于工作流的当前落版初始化会话草稿（「基于工作流迭代」入口，D2）。
     * 会话不直接修改线上工作流：草稿从落版复制一份，迭代 + 确认落版后才产生新版本。
     */
    @PostMapping("/{sessionKey}/seed-draft")
    public Map<String, Object> seedDraft(@PathVariable String sessionKey,
                                         @RequestBody Map<String, String> body) {
        String workflowCode = body != null ? body.get("workflowCode") : null;
        if (workflowCode == null || workflowCode.isEmpty()) {
            return new JSONObject().set("success", false).set("error", "workflowCode is required");
        }
        GaiaWorkflow workflow = workflowService.getOne(
            new QueryWrapper<GaiaWorkflow>().eq("workflow_code", workflowCode).last("LIMIT 1"));
        if (workflow == null || workflow.getCurrentVersionId() == null) {
            return new JSONObject().set("success", false).set("error", "workflow not found: " + workflowCode);
        }
        GaiaWorkflowVersion version = workflowVersionService.getById(workflow.getCurrentVersionId());
        if (version == null || version.getWorkflowData() == null) {
            return new JSONObject().set("success", false).set("error", "workflow current version not found");
        }
        JSONObject dsl;
        try {
            dsl = cn.hutool.json.JSONUtil.parseObj(version.getWorkflowData());
        } catch (Exception e) {
            return new JSONObject().set("success", false).set("error", "invalid workflow data");
        }
        String summary = "基于 " + workflowCode + " " + version.getVersionNumber() + " 迭代";
        draftService.replace(sessionKey, dsl, "stable", summary);
        // 无 run 上下文，直接经事件总线广播文档，让在线窗口立即渲染出「被迭代的那份」
        eventBus.publish(sessionKey, "document", new JSONObject().set("dsl", draftService.get(sessionKey)));
        return new JSONObject()
            .set("success", true)
            .set("workflowCode", workflowCode)
            .set("versionNumber", version.getVersionNumber())
            .set("nodeCount", dsl.getJSONArray("nodes") != null ? dsl.getJSONArray("nodes").size() : 0);
    }
}
