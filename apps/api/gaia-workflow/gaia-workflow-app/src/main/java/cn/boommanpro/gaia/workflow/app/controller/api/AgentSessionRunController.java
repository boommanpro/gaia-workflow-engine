package cn.boommanpro.gaia.workflow.app.controller.api;

import cn.boommanpro.gaia.workflow.app.agent.session.AgentSessionRunService;
import cn.boommanpro.gaia.workflow.app.agent.session.SessionArtifactStore;
import cn.boommanpro.gaia.workflow.app.agent.session.SessionCompactionService;
import cn.boommanpro.gaia.workflow.app.agent.session.SessionEventBus;
import cn.boommanpro.gaia.workflow.app.agent.session.SessionDraftPublishService;
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
 *  POST /api/agent/session/{key}/push-draft 前端画布草稿回推（回滚后/提问前/保存前对齐）
 *  GET  /api/agent/session/{key}/artifacts 会话产物列表（workflow/plan/test_report/release）
 * </pre>
 */
@Slf4j
@RestController
@RequestMapping("/api/agent/session")
public class AgentSessionRunController {

    private final AgentSessionRunService runService;
    private final SessionWorkflowDraftService draftService;
    private final SessionCompactionService compactionService;
    private final SessionArtifactStore artifactStore;
    private final GaiaWorkflowService workflowService;
    private final GaiaWorkflowVersionService workflowVersionService;
    private final SessionEventBus eventBus;
    private final cn.boommanpro.gaia.workflow.app.agent.session.AskUserRoundOrchestrator askRoundOrchestrator;
    private final SessionDraftPublishService publishService;
    private final cn.boommanpro.gaia.workflow.infra.manage.service.AgentMessageService messageService;
    private final cn.boommanpro.gaia.workflow.app.service.LlmCompletionService llmCompletionService;

    public AgentSessionRunController(AgentSessionRunService runService,
                                     SessionWorkflowDraftService draftService,
                                     SessionCompactionService compactionService,
                                     SessionArtifactStore artifactStore,
                                     GaiaWorkflowService workflowService,
                                     GaiaWorkflowVersionService workflowVersionService,
                                     SessionEventBus eventBus,
                                     SessionDraftPublishService publishService,
                                     cn.boommanpro.gaia.workflow.app.agent.session.AskUserRoundOrchestrator askRoundOrchestrator,
                                     cn.boommanpro.gaia.workflow.infra.manage.service.AgentMessageService messageService,
                                     cn.boommanpro.gaia.workflow.app.service.LlmCompletionService llmCompletionService) {
        this.runService = runService;
        this.draftService = draftService;
        this.compactionService = compactionService;
        this.artifactStore = artifactStore;
        this.workflowService = workflowService;
        this.workflowVersionService = workflowVersionService;
        this.eventBus = eventBus;
        this.publishService = publishService;
        this.askRoundOrchestrator = askRoundOrchestrator;
        this.messageService = messageService;
        this.llmCompletionService = llmCompletionService;
    }

    /** 用户回答 ask_user 提问：答案成为新一轮对话（唤醒挂起工具 + 停旧 run + 以答案启动新 run） */
    @PostMapping("/{sessionKey}/ask/{askId}/answer")
    public org.springframework.http.ResponseEntity<JSONObject> answerAsk(@PathVariable String sessionKey,
                                                @PathVariable String askId,
                                                @RequestBody java.util.Map<String, Object> body) {
        String answer = body != null && body.get("answer") != null ? String.valueOf(body.get("answer")) : "";
        boolean ok = askRoundOrchestrator.startRound(sessionKey, askId, answer, false, true);
        if (!ok) {
            return org.springframework.http.ResponseEntity.status(404).body(new JSONObject()
                .set("ok", false).set("error", "提问不存在或已超时"));
        }
        return org.springframework.http.ResponseEntity.ok(new JSONObject().set("ok", true));
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

    /** SSE 心跳调度器（单线程足够：send 很快，慢客户端由 complete 兜底） */
    private static final java.util.concurrent.ScheduledExecutorService SSE_HEARTBEAT =
        java.util.concurrent.Executors.newSingleThreadScheduledExecutor(r -> {
            Thread t = new Thread(r, "sse-heartbeat");
            t.setDaemon(true);
            return t;
        });

    /**
     * 订阅会话事件流（SSE，支持断线重连回放）
     */
    @GetMapping("/{sessionKey}/events")
    public SseEmitter events(@PathVariable String sessionKey) {
        SseEmitter emitter = new SseEmitter(0L);
        AtomicReference<Runnable> unsubscribeRef = new AtomicReference<>(() -> { });
        // SSE 心跳：20s 一条 comment。作用①防代理/负载均衡掐断空闲长连接；
        // ②喂前端空闲看门狗（60s 无字节自动断开重连，根治「运行中卡死不报错」）。
        // comment 帧不会触发前端任何事件处理，零成本。
        java.util.concurrent.ScheduledFuture<?> heartbeat = SSE_HEARTBEAT.scheduleAtFixedRate(() -> {
            try {
                emitter.send(SseEmitter.event().comment("ping"));
            } catch (Exception e) {
                // 发送失败（连接已死）：complete 触发 onCompletion → 退订 + 心跳取消
                try {
                    emitter.complete();
                } catch (Exception ignored) {
                    // ignore
                }
            }
        }, 20, 20, java.util.concurrent.TimeUnit.SECONDS);
        emitter.onCompletion(() -> {
            heartbeat.cancel(false);
            Runnable unsub = unsubscribeRef.get();
            if (unsub != null) {
                unsub.run();
            }
        });
        emitter.onTimeout(() -> {
            heartbeat.cancel(false);
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
     * 手动压缩会话历史：把前半段（user 消息边界安全切分）摘要为一条 user 消息，
     * 被压缩消息标记 compacted=1 不再进入模型上下文（surface replace 语义）。
     */
    @PostMapping("/{sessionKey}/compact")
    public Map<String, Object> compact(@PathVariable String sessionKey) {
        return compactionService.compact(sessionKey);
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
     * 保存为版本（用户动作）：把当前会话草稿落为工作流版本。
     * AI 没有 save_workflow 工具——持久化只能由用户在界面触发。
     */
    @PostMapping("/{sessionKey}/save")
    public Map<String, Object> saveDraft(@PathVariable String sessionKey,
                                         @RequestBody(required = false) Map<String, Object> body) {
        String workflowCode = body != null && body.get("workflowCode") != null
            ? String.valueOf(body.get("workflowCode")) : null;
        String name = body != null && body.get("name") != null ? String.valueOf(body.get("name")) : null;
        String versionDesc = body != null && body.get("versionDesc") != null
            ? String.valueOf(body.get("versionDesc")) : null;
        Long baseRevision = body != null && body.get("baseRevision") instanceof Number
            ? ((Number) body.get("baseRevision")).longValue() : null;
        SessionDraftPublishService.PublishResult result =
            publishService.publish(sessionKey, workflowCode, name, versionDesc, baseRevision);
        JSONObject response = new JSONObject().set("success", result.success);
        if (result.success) {
            response.set("message", result.message);
            response.putAll(result.payload);
        } else {
            response.set("error", result.error);
        }
        return response;
    }

    /** 当前服务端画布草稿 */
    @GetMapping("/{sessionKey}/document")
    public Map<String, Object> document(@PathVariable String sessionKey) {
        JSONObject doc = draftService.get(sessionKey);
        return doc;
    }

    /**
     * 前端画布草稿回推（阶段 1.1）：以用户眼前的画布为准更新会话草稿。
     * 触发点：回滚后（撤销要同步撤销）、编辑器提问前（AI 基于当前未保存参数）、
     * 「保存为版本」前（落的就是所见内容）。成功后广播 document，让其他在线窗口对齐。
     */
    @PostMapping("/{sessionKey}/push-draft")
    public Map<String, Object> pushDraft(@PathVariable String sessionKey,
                                         @RequestBody(required = false) Map<String, Object> body) {
        Object dslRaw = body != null ? body.get("dsl") : null;
        if (dslRaw == null) {
            return new JSONObject().set("success", false).set("error", "dsl is required");
        }
        JSONObject dsl;
        try {
            dsl = cn.hutool.json.JSONUtil.parseObj(dslRaw);
        } catch (Exception e) {
            return new JSONObject().set("success", false).set("error", "invalid dsl: " + e.getMessage());
        }
        String workflowCode = body.get("workflowCode") != null
            ? String.valueOf(body.get("workflowCode")) : null;

        // 绑定到新的工作流编码时，以该工作流当前 revision 作为落版 CAS 基准
        Long baseRevision = null;
        if (workflowCode != null && !workflowCode.isEmpty()
            && !workflowCode.equals(draftService.getBoundCode(sessionKey))) {
            GaiaWorkflow workflow = workflowService.getOne(
                new QueryWrapper<GaiaWorkflow>().eq("workflow_code", workflowCode).last("LIMIT 1"));
            if (workflow != null) {
                baseRevision = workflow.getRevision() != null ? workflow.getRevision() : 0L;
            }
        }
        JSONObject result = draftService.push(sessionKey, dsl, workflowCode, baseRevision);
        if (result.getBool("success", false)) {
            // 无 run 上下文，直接经事件总线广播（在线窗口立即看到回滚/同步后的画布）
            eventBus.publish(sessionKey, "document",
                new JSONObject().set("dsl", draftService.publicDoc(sessionKey)));
            insertCanvasNote(sessionKey, body != null && body.get("source") != null
                ? String.valueOf(body.get("source")) : null, result);
        }
        return result;
    }

    /**
     * 画布变更注记 —— 模型感知用户手改的通道：手改/回滚推送成功后往会话历史写一条
     * user 消息（复用 compaction 前情摘要的先例），下一轮对话模型天然读到，
     * 不再依赖它恰好主动 get(target=canvas)。连续编辑合并更新同一条注记，不刷屏。
     * ask/保存前的推送不写：紧随其后的用户消息本身就是完整意图。
     */
    private void insertCanvasNote(String sessionKey, String source, JSONObject pushResult) {
        boolean rollback = "rollback".equals(source);
        boolean manual = "manual-edit".equals(source);
        if (!rollback && !manual) {
            return;
        }
        try {
            JSONObject doc = draftService.get(sessionKey);
            String content = "[画布更新] 用户" + (rollback ? "回滚了画布" : "手动编辑了画布")
                + "（修订 r" + pushResult.getInt("draftRevision", 0)
                + "，当前 " + doc.getJSONArray("nodes").size() + " 节点 · "
                + doc.getJSONArray("edges").size() + " 连线）";
            cn.boommanpro.gaia.workflow.infra.manage.entity.AgentMessage latest = messageService.getOne(
                new QueryWrapper<cn.boommanpro.gaia.workflow.infra.manage.entity.AgentMessage>()
                    .eq("session_key", sessionKey)
                    .likeRight("content", "[画布更新]")
                    .orderByDesc("id").last("LIMIT 1"));
            if (latest != null) {
                latest.setContent(content);
                messageService.updateById(latest);
            } else {
                cn.boommanpro.gaia.workflow.infra.manage.entity.AgentMessage note =
                    new cn.boommanpro.gaia.workflow.infra.manage.entity.AgentMessage();
                note.setSessionKey(sessionKey);
                note.setRole("user");
                note.setContent(content);
                note.setCreatedAt(java.time.LocalDateTime.now());
                messageService.save(note);
            }
        } catch (Exception e) {
            log.warn("[push-draft] canvas note failed (ignored): {}", e.getMessage());
        }
    }

    /**
     * 版本历史 AI 摘要：把快照条目的变更明细批量总结成一句话，供右上角版本记录
     * 展示（帮助用户回忆每一版做了什么、决定回滚到哪）。一次最多 30 条；
     * 失败返回 success:false（前端退回规则摘要，不阻塞历史面板打开）。
     */
    @PostMapping("/{sessionKey}/snapshot-summaries")
    public Map<String, Object> snapshotSummaries(@PathVariable String sessionKey,
                                                 @RequestBody Map<String, Object> body) {
        Object itemsRaw = body != null ? body.get("snapshots") : null;
        if (!(itemsRaw instanceof List) || ((List<?>) itemsRaw).isEmpty()) {
            return new JSONObject().set("success", false).set("error", "snapshots is required");
        }
        List<?> items = (List<?>) itemsRaw;
        if (items.size() > 30) {
            items = items.subList(0, 30);
        }
        try {
            String systemPrompt = "你是工作流版本历史的摘要助手。对给出的每个版本条目，用一句不超过 20 字的中文"
                + "概括这一版做了什么（依据变更明细：新增/删除/修改了哪些节点或连线）。"
                + "只输出 JSON 数组，形如 [{\"id\":\"...\",\"summary\":\"...\"}]，不要输出任何解释。";
            String reply = llmCompletionService.complete(systemPrompt,
                cn.hutool.json.JSONUtil.toJsonStr(items), 0.2, 800);
            // 容错：剥掉可能存在的 ```json 围栏
            String cleaned = reply == null ? "" : reply.trim()
                .replaceAll("^```(json)?", "")
                .replaceAll("```$", "")
                .trim();
            cn.hutool.json.JSONArray arr = cn.hutool.json.JSONUtil.parseArray(cleaned);
            JSONObject summaries = new JSONObject();
            for (int i = 0; i < arr.size(); i++) {
                cn.hutool.json.JSONObject item = arr.getJSONObject(i);
                if (item != null && item.getStr("id") != null && item.getStr("summary") != null) {
                    summaries.set(item.getStr("id"), item.getStr("summary"));
                }
            }
            return new JSONObject().set("success", true).set("summaries", summaries);
        } catch (Exception e) {
            log.warn("[snapshot-summaries] failed: {}", e.getMessage());
            return new JSONObject().set("success", false).set("error", e.getMessage());
        }
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
        // 绑定草稿到该工作流并持久化绑定（replace 重置 _meta —— 不绑定的话用户
        // 「保存为版本」时会新建 wf_xxx 而不是迭代原工作流）
        draftService.rebind(sessionKey, workflowCode,
            workflow.getRevision() != null ? workflow.getRevision() : 0L);
        draftService.persistArtifact(sessionKey, "stable", summary);
        // 无 run 上下文，直接经事件总线广播文档，让在线窗口立即渲染出「被迭代的那份」
        eventBus.publish(sessionKey, "document", new JSONObject().set("dsl", draftService.get(sessionKey)));
        return new JSONObject()
            .set("success", true)
            .set("workflowCode", workflowCode)
            .set("versionNumber", version.getVersionNumber())
            .set("nodeCount", dsl.getJSONArray("nodes") != null ? dsl.getJSONArray("nodes").size() : 0);
    }
}
