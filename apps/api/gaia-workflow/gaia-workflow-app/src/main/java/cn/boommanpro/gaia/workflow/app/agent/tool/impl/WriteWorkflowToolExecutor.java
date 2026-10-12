package cn.boommanpro.gaia.workflow.app.agent.tool.impl;

import cn.boommanpro.gaia.workflow.app.agent.core.AgentRunContext;
import cn.boommanpro.gaia.workflow.app.agent.core.ExecutionSurface;
import cn.boommanpro.gaia.workflow.app.agent.session.SessionWorkflowDraftService;
import cn.boommanpro.gaia.workflow.app.agent.tool.ToolErrorCode;
import cn.boommanpro.gaia.workflow.app.agent.tool.ToolExecutor;
import cn.boommanpro.gaia.workflow.app.agent.tool.ToolResult;
import cn.boommanpro.gaia.workflow.app.service.AgentModelConfigService;
import cn.boommanpro.gaia.workflow.app.service.WorkflowDslCanonicalizer;
import cn.boommanpro.gaia.workflow.infra.manage.entity.GaiaWorkflow;
import cn.boommanpro.gaia.workflow.infra.manage.entity.GaiaWorkflowVersion;
import cn.boommanpro.gaia.workflow.infra.manage.service.GaiaWorkflowService;
import cn.boommanpro.gaia.workflow.infra.manage.service.GaiaWorkflowVersionService;
import cn.hutool.json.JSONArray;
import cn.hutool.json.JSONObject;
import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

/**
 * write_workflow —— 整份 DSL 一次成型，写入会话草稿（不落版）。
 *
 * <p>2026-10-11 语义变更：AI 产出的工作流与对话绑定（会话草稿），不再自动产生版本；
 * 持久化是用户动作——用户在界面点「保存为版本」时由前端调用落版端点。
 * AI 的交付 = 草稿 + run_workflow 试运行验证通过。</p>
 *
 * <p>传 workflowCode 时若草稿未绑定/绑定了别的工作流，先从该工作流当前版本水化
 * （记录 CAS 基准，供日后用户保存时做并发保护），再用本次 DSL 整体替换草稿。
 * 校验拒绝时回执附带按提交节点类型生成的完整可抄结构（skeletonExample）——
 * 空壳骨架策略靠它纠正，比让模型自己组装更可靠。</p>
 */
@Slf4j
@Component
public class WriteWorkflowToolExecutor implements ToolExecutor {

    private final SessionWorkflowDraftService draftService;
    private final GaiaWorkflowService workflowService;
    private final GaiaWorkflowVersionService versionService;
    private final AgentModelConfigService modelConfigService;

    public WriteWorkflowToolExecutor(SessionWorkflowDraftService draftService,
                                     GaiaWorkflowService workflowService,
                                     GaiaWorkflowVersionService versionService,
                                     AgentModelConfigService modelConfigService) {
        this.draftService = draftService;
        this.workflowService = workflowService;
        this.versionService = versionService;
        this.modelConfigService = modelConfigService;
    }

    @Override
    public String name() {
        return "write_workflow";
    }

    @Override
    public ExecutionSurface surface() {
        return ExecutionSurface.ANY;
    }

    @Override
    public String description() {
        return "整份 DSL 一次成型写入会话草稿（不落版）。仅新建或推倒重来用；日常增量修改用 edit_workflow";
    }

    /** 落草稿前语义校验：结构无法识别 / 致命问题 / 零连线直接回传模型修复（不写草稿） */
    private ToolResult validateSemantics(JSONObject args) {
        if (args.get("nodes") == null) {
            return ToolResult.fail("{\"error\":\"nodes is required\"}", "缺少 nodes 参数",
                ToolErrorCode.INVALID_ARGS);
        }
        JSONObject dsl = buildDsl(args);
        try {
            WorkflowDslCanonicalizer.Result canonical =
                WorkflowDslCanonicalizer.canonicalize(dsl.toString(), platformLlmDefaults());
            if (canonical.getJson() == null) {
                return ToolResult.fail(
                    new JSONObject().set("error", "dsl 结构无法识别：未解析出任何合法节点").toString(),
                    "DSL 结构无法识别", ToolErrorCode.INVALID_ARGS);
            }
            if (!canonical.getFatalIssues().isEmpty()) {
                JSONObject example = skeletonExample(dsl);
                JSONObject error = new JSONObject()
                    .set("error", buildFatalError(canonical.getFatalIssues()))
                    .set("completeExample", example);
                // message 内联示例全文（模型对 message 的注意力远高于 payload 深层字段；
                // 2026-10-11 实证：示例只放 payload.completeExample 时模型连续 8 次重发空壳）
                return ToolResult.fail(error.toString(),
                    "校验未通过：" + String.join("；", canonical.getFatalIssues())
                        + "。【直接可抄】你提交的节点骨架补全后是（把 <占位> 换成真实业务值，"
                        + "保持你原有的 edges 不变，原样重发 write_workflow）："
                        + example.toString());
            }
            JSONObject parsed = cn.hutool.json.JSONUtil.parseObj(canonical.getJson());
            JSONArray edges = parsed.getJSONArray("edges");
            JSONArray nodesArr = parsed.getJSONArray("nodes");
            if (nodesArr != null && nodesArr.size() >= 2 && (edges == null || edges.isEmpty())) {
                return ToolResult.fail(
                    new JSONObject().set("error", "edges is empty: " + nodesArr.size()
                        + " nodes but 0 edges. 提交的 DSL 缺少节点连线，所有节点都是孤立的。"
                        + "请补全 edges（start → ... → end 完整链路）后重新提交，"
                        + "或用 read_workflow 获取真实连线关系，不要凭记忆重构。").toString(),
                    "校验未通过：" + nodesArr.size() + " 个节点但没有任何连线",
                    ToolErrorCode.INVALID_ARGS);
            }
            return null;
        } catch (Exception e) {
            log.warn("[tool:write_workflow] semantic validation failed: {}", e.getMessage());
            return null;
        }
    }

    @Override
    public ToolResult execute(JSONObject args, AgentRunContext context) {
        ToolResult invalid = validateSemantics(args);
        if (invalid != null) {
            return invalid;
        }

        String sessionKey = context.getSessionKey();
        String workflowCode = args.getStr("workflowCode");
        // 绑定：显式 workflowCode 且草稿没绑它 → 水化（记录 CAS 基准），再整写草稿
        if (workflowCode != null && !workflowCode.trim().isEmpty()) {
            String hydrateError = hydrateIfNeeded(sessionKey, workflowCode.trim());
            if (hydrateError != null) {
                return ToolResult.notFound(hydrateError);
            }
        }
        // replace 会重置 meta，先记下绑定与基准，替换后恢复
        String boundCode = draftService.getBoundCode(sessionKey);
        Long baseRevision = draftService.getBaseRevision(sessionKey);

        JSONObject dsl = buildDsl(args);
        WorkflowDslCanonicalizer.Result canonical;
        try {
            canonical = WorkflowDslCanonicalizer.canonicalize(dsl.toString(), platformLlmDefaults());
        } catch (Exception e) {
            return ToolResult.fail(new JSONObject().set("error", "规范化失败: " + e.getMessage()).toString(),
                "DSL 规范化失败", ToolErrorCode.INVALID_ARGS);
        }
        if (canonical == null || canonical.getJson() == null) {
            return ToolResult.fail(new JSONObject().set("error", "dsl 结构无法识别").toString(),
                "DSL 结构无法识别", ToolErrorCode.INVALID_ARGS);
        }

        JSONObject doc = cn.hutool.json.JSONUtil.parseObj(canonical.getJson());
        int nodeCount = doc.getJSONArray("nodes") == null ? 0 : doc.getJSONArray("nodes").size();
        draftService.replace(sessionKey, doc, "draft",
            "AI 生成工作流草稿 · " + nodeCount + " 节点（未落版）");
        if (boundCode != null && !boundCode.isEmpty()) {
            draftService.rebind(sessionKey, boundCode, baseRevision);
        }
        draftService.emitDocument(context, sessionKey);

        log.info("[tool:write_workflow] draft written ({} nodes, bound={})", nodeCount,
            draftService.getBoundCode(sessionKey));

        JSONObject payload = new JSONObject()
            .set("success", true)
            .set("nodeCount", nodeCount)
            .set("edgeCount", doc.getJSONArray("edges") == null ? 0 : doc.getJSONArray("edges").size())
            .set("boundCode", draftService.getBoundCode(sessionKey))
            .set("persisted", false);
        if (!canonical.getRepairs().isEmpty()) {
            payload.set("repairs", canonical.getRepairs());
        }
        if (!canonical.getWarnings().isEmpty()) {
            payload.set("warnings", canonical.getWarnings());
        }

        String hint = "已写入会话草稿（" + nodeCount + " 节点，未落版）。"
            + "用 run_workflow 试运行验证，全部通过后提醒用户在界面「保存为版本」——"
            + "你没有落版工具，持久化由用户决定";
        if (!canonical.getWarnings().isEmpty()) {
            hint = hint + "。注意：" + String.join("；", canonical.getWarnings());
        }
        return ToolResult.ok(payload.toString(), hint);
    }

    // ---------------- 内部 ----------------

    /**
     * 按模型提交的节点类型生成「最小完整 data」示例（2026-10-11：模型反复提交空壳骨架，
     * 文档教学拦不住行为惯性 —— 直接把它要写的骨架补全成可抄结构，组装成本挪到服务端）。
     */
    static JSONObject skeletonExample(JSONObject dsl) {
        JSONObject example = new JSONObject(true);
        JSONArray nodes = dsl.getJSONArray("nodes");
        if (nodes == null || nodes.isEmpty()) {
            return example;
        }
        boolean conditionDone = false;
        String startId = "start_1";
        for (int i = 0; i < nodes.size(); i++) {
            JSONObject n = nodes.getJSONObject(i);
            if (n == null) {
                continue;
            }
            String type = n.getStr("type");
            String id = n.getStr("id") != null ? n.getStr("id") : type + "_" + i;
            JSONObject data = new JSONObject(true);
            switch (type == null ? "" : type) {
                case "start" -> {
                    data.set("title", "开始");
                    JSONObject props = new JSONObject();
                    props.set("inputText", new JSONObject().set("type", "string")
                        .set("title", "待检测字符串").set("default", ""));
                    data.set("outputs", new JSONObject().set("type", "object").set("properties", props));
                    startId = id;
                }
                case "condition" -> {
                    data.set("title", "条件判断");
                    JSONObject left = new JSONObject().set("type", "ref");
                    JSONArray leftContent = new JSONArray();
                    leftContent.add(startId);
                    leftContent.add("inputText");
                    left.set("content", leftContent);
                    JSONObject value = new JSONObject().set("left", left)
                        .set("operator", "contains")
                        .set("right", new JSONObject().set("type", "constant").set("content", "<目标字符串>"));
                    JSONArray conditions = new JSONArray();
                    conditions.add(new JSONObject().set("key", "if_match").set("value", value));
                    data.set("conditions", conditions);
                    conditionDone = true;
                }
                case "end" -> {
                    data.set("title", "结束");
                    JSONArray resultRef = new JSONArray();
                    resultRef.add(conditionDone ? "condition_1" : "<上游节点id>");
                    resultRef.add("if_match");
                    data.set("inputsValues", new JSONObject().set("result", new JSONObject()
                        .set("type", "ref")
                        .set("content", resultRef)));
                    data.set("inputs", new JSONObject().set("type", "object")
                        .set("properties", new JSONObject().set("result", new JSONObject().set("type", "boolean"))));
                }
                case "llm" -> data.set("prompt", "<从需求推导的提示词，可引用上游输出>");
                case "http" -> data.set("method", "GET").set("url", "https://<真实地址>");
                case "code" -> data.set("script", new JSONObject()
                    .set("content", "({ result: text.indexOf(target) >= 0 })"));
                case "variable" -> {
                    JSONArray assign = new JSONArray();
                    assign.add(new JSONObject().set("left", "result")
                        .set("operator", "declare")
                        .set("right", new JSONObject().set("type", "constant").set("content", "<值>")));
                    data.set("assign", assign);
                }
                default -> data.set("title", n.getStr("title") != null ? n.getStr("title") : type);
            }
            example.set(id, data);
        }
        return example;
    }

    /** 草稿与目标工作流未绑定时从当前版本水化（记录 CAS 基准）；返回错误文案（null=成功） */
    private String hydrateIfNeeded(String sessionKey, String workflowCode) {
        if (workflowCode.equals(draftService.getBoundCode(sessionKey))) {
            return null;
        }
        GaiaWorkflow workflow = workflowService.getOne(
            new QueryWrapper<GaiaWorkflow>().eq("workflow_code", workflowCode).last("LIMIT 1"));
        if (workflow == null) {
            return "工作流 " + workflowCode;
        }
        GaiaWorkflowVersion current = null;
        if (workflow.getCurrentVersionId() != null) {
            current = versionService.getById(workflow.getCurrentVersionId());
        }
        long revision = workflow.getRevision() != null ? workflow.getRevision() : 0L;
        if (current != null && current.getWorkflowData() != null) {
            draftService.bindFromVersion(sessionKey, workflowCode, revision,
                cn.hutool.json.JSONUtil.parseObj(current.getWorkflowData()));
        } else {
            // 空壳工作流：绑定编码但不水化内容，草稿从零开始
            draftService.bindFromVersion(sessionKey, workflowCode, revision, new JSONObject());
        }
        return null;
    }

    private JSONObject buildDsl(JSONObject args) {
        JSONObject dsl = new JSONObject();
        dsl.set("nodes", args.get("nodes"));
        if (args.get("edges") != null) {
            dsl.set("edges", args.get("edges"));
        } else {
            dsl.set("edges", new JSONArray());
        }
        if (args.get("globalVariable") != null) {
            dsl.set("globalVariable", args.get("globalVariable"));
        }
        return dsl;
    }

    private String buildFatalError(java.util.List<String> fatalIssues) {
        return "工作流存在不可执行的缺失，已拒绝写入：" + String.join("；", fatalIssues)
            + "。llm 节点无需填写 apiKey/apiHost/modelName（系统自动填平台默认模型）。"
            + "补全后重新提交；修改已有工作流用 edit_workflow 的 updateNodes 更省事。";
    }

    private WorkflowDslCanonicalizer.LlmDefaults platformLlmDefaults() {
        try {
            AgentModelConfigService.LlmConfig llm = modelConfigService.getLlmConfig();
            if (llm == null) {
                return null;
            }
            return new WorkflowDslCanonicalizer.LlmDefaults(llm.getApiHost(), llm.getApiKey(), llm.getModel());
        } catch (Exception e) {
            log.warn("[tool:write_workflow] 读取平台默认模型配置失败: {}", e.getMessage());
            return null;
        }
    }
}
