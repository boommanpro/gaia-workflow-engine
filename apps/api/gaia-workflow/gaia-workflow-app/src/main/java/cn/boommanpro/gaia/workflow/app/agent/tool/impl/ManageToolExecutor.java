package cn.boommanpro.gaia.workflow.app.agent.tool.impl;

import cn.boommanpro.gaia.workflow.app.agent.core.AgentRunContext;
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

    public ManageToolExecutor(GaiaWorkflowService workflowService,
                              GaiaWorkflowTemplateAppService templateService,
                              SessionWorkflowDraftService draftService,
                              WorkflowDslApplyService dslApplyService) {
        this.workflowService = workflowService;
        this.templateService = templateService;
        this.draftService = draftService;
        this.dslApplyService = dslApplyService;
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
        if (id == null) {
            String code = args.getStr("workflowCode");
            if (code == null || code.isEmpty()) {
                return ToolResult.fail("{\"error\":\"id or workflowCode is required\"}", "缺少删除目标");
            }
            boolean removed = workflowService.remove(
                new QueryWrapper<GaiaWorkflow>().eq("workflow_code", code));
            return removed
                ? ToolResult.ok("{\"success\":true}", "已删除工作流 " + code)
                : ToolResult.fail("{\"error\":\"workflow not found\"}", "工作流不存在");
        }
        return workflowService.removeById(id)
            ? ToolResult.ok("{\"success\":true}", "已删除工作流 " + id)
            : ToolResult.fail("{\"error\":\"workflow not found\"}", "工作流不存在");
    }

    /**
     * saveWorkflow：把当前会话的服务端画布草稿落为一个生效版本。
     * 后端自治模式下「画布」即 {@link SessionWorkflowDraftService} 的草稿文档，
     * 与 applyWorkflow 共用同一条 {@link WorkflowDslApplyService} 落版链路。
     */
    private ToolResult saveWorkflow(JSONObject args, AgentRunContext context) {
        String workflowCode = args.getStr("workflowCode");
        JSONObject doc = draftService.get(context.getSessionKey());
        JSONArray nodes = doc != null ? doc.getJSONArray("nodes") : null;
        if (nodes == null || nodes.isEmpty()) {
            return ToolResult.fail("{\"error\":\"当前画布为空，请先构建节点\"}",
                "当前画布为空，请先构建节点");
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
        return ToolResult.ok(new JSONObject()
            .set("success", true)
            .set("workflowCode", workflowCode)
            .set("versionNumber", result.getVersionNumber())
            .set("versionId", result.getVersionId())
            .set("nodeCount", result.getNodeCount())
            .toString(), "已保存工作流 " + workflowCode + " " + result.getVersionNumber());
    }

    private static String shortId() {
        return UUID.randomUUID().toString().replace("-", "").substring(0, 12);
    }
}
