package cn.boommanpro.gaia.workflow.app.agent.tool.impl;

import cn.boommanpro.gaia.workflow.app.agent.core.AgentRunContext;
import cn.boommanpro.gaia.workflow.app.agent.core.ExecutionSurface;
import cn.boommanpro.gaia.workflow.app.agent.tool.ToolExecutor;
import cn.boommanpro.gaia.workflow.app.agent.tool.ToolResult;
import cn.boommanpro.gaia.workflow.infra.manage.entity.GaiaWorkflow;
import cn.boommanpro.gaia.workflow.infra.manage.entity.GaiaWorkflowVersion;
import cn.boommanpro.gaia.workflow.infra.manage.service.GaiaWorkflowService;
import cn.boommanpro.gaia.workflow.infra.manage.service.GaiaWorkflowVersionService;
import cn.hutool.json.JSONObject;
import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * read_workflow —— 完整 DSL + revision（dsh read 的对应物）。
 *
 * <p>revision 是后续 edit→save 的 CAS 基准：模型修改已有工作流前必须先读，
 * save/ write 时带 baseRevision，不一致会被 STALE_REVISION 拒绝。
 * 读已有工作流会顺带把它水化成本会话草稿（edit_workflow 的操作对象）。</p>
 */
@Component
public class ReadWorkflowToolExecutor implements ToolExecutor {

    private final GaiaWorkflowService workflowService;
    private final GaiaWorkflowVersionService versionService;
    private final cn.boommanpro.gaia.workflow.app.agent.session.SessionWorkflowDraftService draftService;

    public ReadWorkflowToolExecutor(GaiaWorkflowService workflowService,
                                    GaiaWorkflowVersionService versionService,
                                    cn.boommanpro.gaia.workflow.app.agent.session.SessionWorkflowDraftService draftService) {
        this.workflowService = workflowService;
        this.versionService = versionService;
        this.draftService = draftService;
    }

    @Override
    public String name() {
        return "read_workflow";
    }

    @Override
    public ExecutionSurface surface() {
        return ExecutionSurface.BACKEND_ONLY;
    }

    @Override
    public String description() {
        return "读取工作流完整 DSL（含 revision，修改前必读）";
    }

    @Override
    public ToolResult execute(JSONObject args, AgentRunContext context) {
        String code = args.getStr("workflowCode");
        GaiaWorkflow workflow = workflowService.getOne(
            new QueryWrapper<GaiaWorkflow>().eq("workflow_code", code).last("LIMIT 1"));
        if (workflow == null) {
            return ToolResult.notFound("工作流 " + code);
        }

        GaiaWorkflowVersion current = null;
        if (workflow.getCurrentVersionId() != null) {
            current = versionService.getById(workflow.getCurrentVersionId());
        }
        if (current == null) {
            List<GaiaWorkflowVersion> versions = versionService.list(
                new QueryWrapper<GaiaWorkflowVersion>()
                    .eq("workflow_code", code).orderByDesc("created_at").last("LIMIT 1"));
            current = versions.isEmpty() ? null : versions.get(0);
        }
        long revision = workflow.getRevision() != null ? workflow.getRevision() : 0L;

        // 水化会话草稿：本会话后续 edit_workflow 的 ops 作用在这份草稿上
        boolean hydrated = false;
        if (current != null && current.getWorkflowData() != null) {
            try {
                hydrated = draftService.bindFromVersion(
                    context.getSessionKey(), code, revision,
                    cn.hutool.json.JSONUtil.parseObj(current.getWorkflowData()));
            } catch (Exception e) {
                // 水化失败不影响读取本身
            }
        }

        JSONObject payload = new JSONObject()
            .set("workflowCode", code)
            .set("workflowName", workflow.getWorkflowName())
            .set("revision", revision)
            .set("versionNumber", current != null ? current.getVersionNumber() : null)
            .set("dsl", current != null && current.getWorkflowData() != null
                ? cn.hutool.json.JSONUtil.parseObj(current.getWorkflowData()) : null);
        return ToolResult.ok(payload.toString(),
            "已返回 " + code + "（revision " + revision + (hydrated ? "，已同步为会话草稿" : "") + "）");
    }
}
