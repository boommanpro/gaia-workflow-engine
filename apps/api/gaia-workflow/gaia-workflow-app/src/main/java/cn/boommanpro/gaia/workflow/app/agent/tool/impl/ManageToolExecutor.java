package cn.boommanpro.gaia.workflow.app.agent.tool.impl;

import cn.boommanpro.gaia.workflow.app.agent.core.AgentRunContext;
import cn.boommanpro.gaia.workflow.app.agent.core.ToolPolicyService;
import cn.boommanpro.gaia.workflow.app.agent.llm.LlmToolCall;
import cn.boommanpro.gaia.workflow.app.agent.session.SessionWorkflowDraftService;
import cn.boommanpro.gaia.workflow.app.agent.tool.ToolExecutor;
import cn.boommanpro.gaia.workflow.app.agent.tool.ToolResult;
import cn.boommanpro.gaia.workflow.app.service.WorkflowDslApplyService;
import cn.boommanpro.gaia.workflow.infra.manage.entity.GaiaWorkflow;
import cn.boommanpro.gaia.workflow.infra.manage.entity.GaiaWorkflowTemplate;
import cn.boommanpro.gaia.workflow.infra.manage.service.GaiaWorkflowService;
import cn.boommanpro.gaia.workflow.infra.manage.service.GaiaWorkflowTemplateAppService;
import cn.hutool.json.JSONArray;
import cn.hutool.json.JSONObject;
import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * 资源管理类工具的后端执行器。
 *
 * <p>只实现纯服务端可完成的操作。依赖画布当前内容的 {@code saveWorkflow}
 * 不在后端支持的范围内（那份数据在浏览器里），
 * 相关的「整份 DSL 落版」能力请使用 {@link ApplyWorkflowToolExecutor}。</p>
 */
@Slf4j
@Component
public class ManageToolExecutor implements ToolExecutor {

    private final GaiaWorkflowService workflowService;
    private final GaiaWorkflowTemplateAppService templateService;
    private final SessionWorkflowDraftService draftService;
    private final WorkflowDslApplyService dslApplyService;
    private final ToolPolicyService toolPolicyService;

    public ManageToolExecutor(GaiaWorkflowService workflowService,
                              GaiaWorkflowTemplateAppService templateService,
                              SessionWorkflowDraftService draftService,
                              WorkflowDslApplyService dslApplyService,
                              ToolPolicyService toolPolicyService) {
        this.workflowService = workflowService;
        this.templateService = templateService;
        this.draftService = draftService;
        this.dslApplyService = dslApplyService;
        this.toolPolicyService = toolPolicyService;
    }

    @Override
    public String name() {
        return "manage";
    }

    @Override
    public String description() {
        return "创建/删除工作流与模板";
    }

    @Override
    public ToolResult execute(JSONObject args, AgentRunContext context) {
        String action = args.getStr("action");
        if (action == null || action.isEmpty()) {
            return ToolResult.fail("{\"error\":\"action is required\"}", "缺少 action 参数");
        }

        try {
            switch (action) {
                case "createWorkflow":
                    return createWorkflow(args);
                case "createTemplate":
                    return createTemplate(args);
                case "deleteWorkflow":
                    return deleteWorkflow(args);
                case "saveWorkflow":
                    return saveWorkflow(args, context);
                default:
                    return ToolResult.fail("{\"error\":\"unknown manage action: " + action + "\"}",
                        "不支持的管理操作");
            }
        } catch (Exception e) {
            log.warn("[tool:manage] failed: {}", e.getMessage());
            return ToolResult.fail("{\"error\":\"" + e.getMessage() + "\"}", "操作失败");
        }
    }

    private ToolResult createWorkflow(JSONObject args) {
        String code = "wf_" + shortId();
        GaiaWorkflow workflow = new GaiaWorkflow();
        workflow.setWorkflowCode(code);
        workflow.setWorkflowName(
            args.getStr("name") != null ? args.getStr("name") : "未命名工作流");
        workflow.setWorkflowDesc(args.getStr("desc"));
        workflow.setCreatedAt(LocalDateTime.now());
        workflow.setUpdatedAt(LocalDateTime.now());
        workflowService.save(workflow);

        log.info("[tool:manage] created workflow {}", code);
        return ToolResult.ok(new JSONObject()
            .set("success", true)
            .set("workflowCode", code)
            .set("workflowName", workflow.getWorkflowName())
            .toString(), "已创建工作流 " + code);
    }

    private ToolResult createTemplate(JSONObject args) {
        String code = "tpl_" + shortId();
        GaiaWorkflowTemplate template = new GaiaWorkflowTemplate();
        template.setTemplateCode(code);
        template.setTemplateName(
            args.getStr("name") != null ? args.getStr("name") : "未命名模板");
        template.setTemplateDesc(args.getStr("desc"));
        template.setCreatedAt(LocalDateTime.now());
        template.setUpdatedAt(LocalDateTime.now());
        templateService.save(template);

        return ToolResult.ok(new JSONObject()
            .set("success", true)
            .set("templateCode", code)
            .set("templateName", template.getTemplateName())
            .toString(), "已创建模板 " + code);
    }

    private ToolResult deleteWorkflow(JSONObject args) {
        Long id = args.getLong("id");
        String code = args.getStr("workflowCode");
        if (id == null && (code == null || code.isEmpty())) {
            return ToolResult.fail("{\"error\":\"id or workflowCode is required\"}", "缺少删除目标");
        }
        // 删除不可逆：必须先拿到用户在对话中的明确确认（模型询问用户后带 confirmed=true 重试）
        if (!Boolean.TRUE.equals(args.getBool("confirmed"))) {
            return ToolResult.rejected(new JSONObject()
                .set("error", "confirmation_required")
                .set("message", "删除工作流不可恢复。请先向用户复述要删除的工作流并征求明确同意，"
                    + "用户同意后再次调用本工具并传入 confirmed=true。")
                .toString(), "删除工作流需要用户明确确认");
        }
        if (id != null) {
            return workflowService.removeById(id)
                ? ToolResult.ok("{\"success\":true}", "已删除工作流 " + id)
                : ToolResult.fail("{\"error\":\"workflow not found\"}", "工作流不存在");
        }
        boolean removed = workflowService.remove(
            new QueryWrapper<GaiaWorkflow>().eq("workflow_code", code));
        return removed
            ? ToolResult.ok("{\"success\":true}", "已删除工作流 " + code)
            : ToolResult.fail("{\"error\":\"workflow not found\"}", "工作流不存在");
    }

    /**
     * saveWorkflow：把当前会话的服务端画布草稿落为一个生效版本。
     * 后端自治模式下「画布」即 {@link SessionWorkflowDraftService} 的草稿文档，
     * 与 applyWorkflow 共用同一条 {@link WorkflowDslApplyService} 落版链路。
     *
     * <p>落版是人机交接点：本动作与 applyWorkflow 同样走确认门禁
     * （会话级/全局对 saveWorkflow 配置的策略优先；默认 confirm），
     * 否则模型可以在用户确认 applyWorkflow 后又用 saveWorkflow 无门禁落版，绕过门禁语义。</p>
     */
    private ToolResult saveWorkflow(JSONObject args, AgentRunContext context) {
        String workflowCode = args.getStr("workflowCode");
        JSONObject doc = draftService.get(context.getSessionKey());
        JSONArray nodes = doc != null ? doc.getJSONArray("nodes") : null;
        if (nodes == null || nodes.isEmpty()) {
            return ToolResult.fail("{\"error\":\"当前画布为空，请先构建节点\"}",
                "当前画布为空，请先构建节点");
        }
        // 确认门禁：策略解析 saveWorkflow（会话级 > 全局），无覆盖时默认 confirm
        String policy = toolPolicyService.resolvePolicy(context.getSessionKey(), "saveWorkflow");
        String effective = policy == null || policy.isEmpty() ? "confirm" : policy;
        LlmToolCall syntheticCall = LlmToolCall.builder()
            .id("save-" + System.currentTimeMillis())
            .name("saveWorkflow")
            .arguments(args.toString())
            .build();
        if ("forbid".equals(effective)) {
            return ToolResult.rejected("该操作已被权限策略禁止");
        }
        if ("confirm".equals(effective)
            && !toolPolicyService.decideConfirm(context, syntheticCall, context.getSink())) {
            return ToolResult.rejected("用户未确认保存该版本");
        }
        if (workflowCode == null || workflowCode.isEmpty()) {
            workflowCode = "wf_" + UUID.randomUUID().toString().replace("-", "").substring(0, 12);
        }

        WorkflowDslApplyService.ApplyOptions options = new WorkflowDslApplyService.ApplyOptions();
        options.setWorkflowName(args.getStr("name"));
        options.setWorkflowDesc(args.getStr("desc"));
        options.setVersionDesc("AI 保存草稿");
        options.setCreateIfMissing(true);

        WorkflowDslApplyService.ApplyResult result = dslApplyService.apply(workflowCode, doc, options);
        if (!result.isSuccess()) {
            return ToolResult.fail(
                new JSONObject().set("error", result.getError()).toString(),
                "保存失败：" + result.getError());
        }

        log.info("[tool:manage] saved workflow {} → {} ({} nodes)",
            workflowCode, result.getVersionNumber(), result.getNodeCount());
        // warnings/repairs 必须随回执透传：占位内容不闭环模型就不知道要修（与 applyWorkflow 同一语义）
        JSONObject payload = new JSONObject()
            .set("success", true)
            .set("workflowCode", workflowCode)
            .set("versionNumber", result.getVersionNumber())
            .set("versionId", result.getVersionId())
            .set("nodeCount", result.getNodeCount());
        if (result.getRepairs() != null && !result.getRepairs().isEmpty()) {
            payload.set("repairs", result.getRepairs());
        }
        if (result.getWarnings() != null && !result.getWarnings().isEmpty()) {
            payload.set("warnings", result.getWarnings());
        }
        return ToolResult.ok(payload.toString(),
            "已保存工作流 " + workflowCode + " " + result.getVersionNumber());
    }

    private static String shortId() {
        return UUID.randomUUID().toString().replace("-", "").substring(0, 12);
    }
}
