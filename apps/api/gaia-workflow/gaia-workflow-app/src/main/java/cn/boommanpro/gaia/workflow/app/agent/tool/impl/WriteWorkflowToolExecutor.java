package cn.boommanpro.gaia.workflow.app.agent.tool.impl;

import cn.boommanpro.gaia.workflow.app.agent.core.AgentRunContext;
import cn.boommanpro.gaia.workflow.app.agent.core.ExecutionSurface;
import cn.boommanpro.gaia.workflow.app.agent.session.SessionWorkflowDraftService;
import cn.boommanpro.gaia.workflow.app.agent.tool.ToolErrorCode;
import cn.boommanpro.gaia.workflow.app.agent.tool.ToolExecutor;
import cn.boommanpro.gaia.workflow.app.agent.tool.ToolResult;
import cn.boommanpro.gaia.workflow.app.service.AgentModelConfigService;
import cn.boommanpro.gaia.workflow.app.service.WorkflowDslApplyService;
import cn.boommanpro.gaia.workflow.app.service.WorkflowDslCanonicalizer;
import cn.boommanpro.gaia.workflow.infra.manage.entity.GaiaWorkflow;
import cn.boommanpro.gaia.workflow.infra.manage.service.GaiaWorkflowService;
import cn.hutool.json.JSONArray;
import cn.hutool.json.JSONObject;
import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.UUID;

/**
 * write_workflow —— 整份 DSL 一次成型（原 applyWorkflow，dsh write 的对应物）。
 *
 * <p>定位从「一切产出的首选」降级为「首次创建 / 大重构」：日常迭代走
 * edit_workflow + save_workflow。修改已存在的工作流时必须带 baseRevision
 * （CAS），防止基于陈旧读取的覆盖。</p>
 *
 * <p>落版前先做无副作用语义校验（结构无法识别/致命问题/零连线直接回传模型修复，
 * 不产生任何半成品落版）。</p>
 */
@Slf4j
@Component
public class WriteWorkflowToolExecutor implements ToolExecutor {

    private final WorkflowDslApplyService dslApplyService;
    private final SessionWorkflowDraftService draftService;
    private final GaiaWorkflowService workflowService;
    private final AgentModelConfigService modelConfigService;

    public WriteWorkflowToolExecutor(WorkflowDslApplyService dslApplyService,
                                     SessionWorkflowDraftService draftService,
                                     GaiaWorkflowService workflowService,
                                     AgentModelConfigService modelConfigService) {
        this.dslApplyService = dslApplyService;
        this.draftService = draftService;
        this.workflowService = workflowService;
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
        return "一次性写入完整工作流 DSL 并落为生效版本（新建/大重构用；日常修改用 edit_workflow）";
    }

    /** 落版前语义校验：结构无法识别 / 致命问题 / 零连线直接回传模型（不产生半成品版本） */
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
                return ToolResult.fail(
                    new JSONObject().set("error", buildFatalError(canonical.getFatalIssues())).toString(),
                    "落版校验未通过：" + String.join("；", canonical.getFatalIssues()),
                    ToolErrorCode.INVALID_ARGS);
            }
            JSONArray edges = cn.hutool.json.JSONUtil.parseObj(canonical.getJson()).getJSONArray("edges");
            JSONArray nodesArr = cn.hutool.json.JSONUtil.parseObj(canonical.getJson()).getJSONArray("nodes");
            if (nodesArr != null && nodesArr.size() >= 2 && (edges == null || edges.isEmpty())) {
                return ToolResult.fail(
                    new JSONObject().set("error", "edges is empty: " + nodesArr.size()
                        + " nodes but 0 edges. 提交的 DSL 缺少节点连线，落版后所有节点都是孤立的。"
                        + "请补全 edges（start → ... → end 完整链路）后重新提交，"
                        + "或用 read_workflow 获取真实连线关系，不要凭记忆重构。").toString(),
                    "落版校验未通过：" + nodesArr.size() + " 个节点但没有任何连线",
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
        Object nodes = args.get("nodes");
        if (nodes == null) {
            return ToolResult.fail("{\"error\":\"nodes is required\"}", "缺少 nodes 参数",
                ToolErrorCode.INVALID_ARGS);
        }

        String workflowCode = resolveWorkflowCode(args);
        Long baseRevision = args.getLong("baseRevision");

        // CAS：改的是已存在的工作流却没有 baseRevision → 拒绝并引导先读
        GaiaWorkflow existing = workflowService.getOne(
            new QueryWrapper<GaiaWorkflow>().eq("workflow_code", workflowCode).last("LIMIT 1"));
        if (existing != null && baseRevision == null) {
            return ToolResult.fail(new JSONObject().set("error", new JSONObject()
                .set("code", ToolErrorCode.INVALID_ARGS.name())
                .set("message", "工作流 " + workflowCode + " 已存在，整写会覆盖现有内容。"
                    + "请改用增量方式：read_workflow 水化 → edit_workflow 修改 → save_workflow 落版；"
                    + "或确实要整写时，先 read_workflow 拿 revision 再带 baseRevision 提交")).toString(),
                "修改已有工作流需要 baseRevision", ToolErrorCode.INVALID_ARGS);
        }

        JSONObject dsl = buildDsl(args);
        WorkflowDslApplyService.ApplyOptions options = new WorkflowDslApplyService.ApplyOptions();
        options.setWorkflowName(args.getStr("workflowName"));
        options.setWorkflowDesc(args.getStr("workflowDesc"));
        options.setVersionDesc(args.getStr("versionDesc"));
        options.setCreateIfMissing(true);
        options.setExpectedRevision(baseRevision);

        WorkflowDslApplyService.ApplyResult result = dslApplyService.apply(workflowCode, dsl, options);
        if (!result.isSuccess()) {
            if (result.isStaleRevision()) {
                return ToolResult.staleRevision(workflowCode,
                    result.getExpectedRevision(), result.getActualRevision());
            }
            return ToolResult.fail(
                new JSONObject().set("error", result.getError()).toString(),
                "落版失败：" + result.getError(), ToolErrorCode.INVALID_ARGS);
        }

        // 同步会话草稿（applied 收口）+ 广播
        try {
            WorkflowDslCanonicalizer.Result canonicalized =
                WorkflowDslCanonicalizer.canonicalize(dsl.toString(), platformLlmDefaults());
            if (canonicalized != null && canonicalized.getJson() != null) {
                draftService.replace(context.getSessionKey(),
                    cn.hutool.json.JSONUtil.parseObj(canonicalized.getJson()),
                    "applied", "已落版 " + result.getVersionNumber() + " · " + result.getNodeCount() + " 节点");
                draftService.markApplied(context.getSessionKey(), workflowCode, result.getRevision());
            }
            draftService.emitDocument(context, context.getSessionKey());
        } catch (Exception e) {
            log.warn("[tool:write_workflow] draft sync failed: {}", e.getMessage());
        }

        log.info("[tool:write_workflow] {} → {} ({} nodes)",
            workflowCode, result.getVersionNumber(), result.getNodeCount());

        JSONObject payload = new JSONObject()
            .set("success", true)
            .set("workflowCode", workflowCode)
            .set("versionNumber", result.getVersionNumber())
            .set("revision", result.getRevision())
            .set("nodeCount", result.getNodeCount())
            .set("workflowCreated", result.isWorkflowCreated());
        if (!result.getRepairs().isEmpty()) {
            payload.set("repairs", result.getRepairs());
        }
        if (!result.getWarnings().isEmpty()) {
            payload.set("warnings", result.getWarnings());
        }

        String hint = "已生成工作流 " + workflowCode + " 并落为版本 " + result.getVersionNumber();
        if (!result.getRepairs().isEmpty()) {
            hint = hint + "（系统已自动修补 " + result.getRepairs().size() + " 处不规范结构）";
        }
        if (!result.getWarnings().isEmpty()) {
            hint = hint + "。注意：" + String.join("；", result.getWarnings()) + "。如与用户需求不符请主动修正";
        }
        return ToolResult.ok(payload.toString(), hint);
    }

    // ---------------- 内部 ----------------

    /** 复用同名空壳或生成新编码（不指定 workflowCode = 新建） */
    private String resolveWorkflowCode(JSONObject args) {
        String workflowCode = args.getStr("workflowCode");
        if (workflowCode != null && !workflowCode.isEmpty()) {
            return workflowCode;
        }
        String reused = findEmptyWorkflowToReuse(args.getStr("workflowName"));
        return reused != null ? reused
            : "wf_" + UUID.randomUUID().toString().replace("-", "").substring(0, 12);
    }

    private String findEmptyWorkflowToReuse(String workflowName) {
        if (workflowName == null || workflowName.trim().isEmpty()) {
            return null;
        }
        try {
            GaiaWorkflow shell = workflowService.getOne(
                new QueryWrapper<GaiaWorkflow>()
                    .eq("workflow_name", workflowName.trim())
                    .isNull("current_version_id")
                    .eq("is_deleted", 0)
                    .last("LIMIT 1"));
            return shell != null ? shell.getWorkflowCode() : null;
        } catch (Exception e) {
            return null;
        }
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

    private String buildFatalError(List<String> fatalIssues) {
        return "工作流存在不可执行的缺失，请补全后重新提交：" + String.join("；", fatalIssues)
            + "。修复方法：给对应节点的 data 填上关键字段，例如 "
            + "{\"type\":\"llm\",\"id\":\"llm_0\",\"data\":{\"prompt\":\"请总结以下文本：{{ start_0.text }}\"}}，"
            + "http 节点填 {\"data\":{\"method\":\"GET\",\"url\":\"https://...\"}}，"
            + "code 节点填 {\"data\":{\"script\":{\"language\":\"java\",\"content\":\"return ...;\"}}}。"
            + "llm 节点无需填写 apiKey/apiHost/modelName，系统会自动使用平台默认模型。"
            + "补全后用相同 workflowCode 重新提交。";
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
