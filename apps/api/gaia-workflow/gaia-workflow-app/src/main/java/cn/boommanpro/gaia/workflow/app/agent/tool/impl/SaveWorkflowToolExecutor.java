package cn.boommanpro.gaia.workflow.app.agent.tool.impl;

import cn.boommanpro.gaia.workflow.app.agent.core.AgentRunContext;
import cn.boommanpro.gaia.workflow.app.agent.core.ExecutionSurface;
import cn.boommanpro.gaia.workflow.app.agent.session.SessionWorkflowDraftService;
import cn.boommanpro.gaia.workflow.app.agent.tool.ToolErrorCode;
import cn.boommanpro.gaia.workflow.app.agent.tool.ToolExecutor;
import cn.boommanpro.gaia.workflow.app.agent.tool.ToolResult;
import cn.boommanpro.gaia.workflow.app.service.WorkflowDslApplyService;
import cn.boommanpro.gaia.workflow.infra.manage.entity.GaiaWorkflow;
import cn.boommanpro.gaia.workflow.infra.manage.service.GaiaWorkflowService;
import cn.hutool.json.JSONArray;
import cn.hutool.json.JSONObject;
import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.UUID;

/**
 * save_workflow —— 把会话草稿落为生效版本（edit_workflow 的收口动作）。
 *
 * <p>workflowCode 解析顺序：显式参数 > 草稿绑定 > 生成新编码。
 * 草稿绑定了已有工作流时要求 baseRevision CAS（默认取草稿记录的基准，
 * 模型显式传入则以传入为准）。</p>
 */
@Slf4j
@Component
public class SaveWorkflowToolExecutor implements ToolExecutor {

    private final SessionWorkflowDraftService draftService;
    private final WorkflowDslApplyService dslApplyService;
    private final GaiaWorkflowService workflowService;

    public SaveWorkflowToolExecutor(SessionWorkflowDraftService draftService,
                                    WorkflowDslApplyService dslApplyService,
                                    GaiaWorkflowService workflowService) {
        this.draftService = draftService;
        this.dslApplyService = dslApplyService;
        this.workflowService = workflowService;
    }

    @Override
    public String name() {
        return "save_workflow";
    }

    @Override
    public ExecutionSurface surface() {
        return ExecutionSurface.ANY;
    }

    @Override
    public String description() {
        return "把当前会话草稿落为生效版本（edit_workflow 修改后的收口动作）";
    }

    @Override
    public ToolResult execute(JSONObject args, AgentRunContext context) {
        String sessionKey = context.getSessionKey();
        String workflowCode = args.getStr("workflowCode");
        if (workflowCode == null || workflowCode.isEmpty()) {
            workflowCode = draftService.getBoundCode(sessionKey);
        }

        JSONObject doc = draftService.publicDoc(sessionKey);
        JSONArray nodes = doc != null ? doc.getJSONArray("nodes") : null;
        if (nodes == null || nodes.isEmpty()) {
            return ToolResult.fail(new JSONObject().set("error", "当前画布为空，请先 edit_workflow 构建节点").toString(),
                "当前画布为空", ToolErrorCode.INVALID_ARGS);
        }

        boolean isNew = false;
        Long baseRevision = args.getLong("baseRevision");
        if (baseRevision == null) {
            baseRevision = draftService.getBaseRevision(sessionKey);
        }
        if (workflowCode == null || workflowCode.isEmpty()) {
            workflowCode = "wf_" + UUID.randomUUID().toString().replace("-", "").substring(0, 12);
            isNew = true;
            baseRevision = null; // 新建无基准
        } else {
            GaiaWorkflow existing = workflowService.getOne(
                new QueryWrapper<GaiaWorkflow>().eq("workflow_code", workflowCode).last("LIMIT 1"));
            if (existing == null) {
                isNew = true;
                baseRevision = null;
            } else if (baseRevision == null) {
                // 已有工作流但没有基准（旧会话草稿/边界场景）：以当前值为基准放行，保持向后兼容
                baseRevision = existing.getRevision() != null ? existing.getRevision() : 0L;
            }
        }

        WorkflowDslApplyService.ApplyOptions options = new WorkflowDslApplyService.ApplyOptions();
        options.setWorkflowName(args.getStr("name") != null ? args.getStr("name") : args.getStr("workflowName"));
        options.setWorkflowDesc(args.getStr("desc") != null ? args.getStr("desc") : args.getStr("workflowDesc"));
        options.setVersionDesc(args.getStr("versionDesc") != null ? args.getStr("versionDesc") : "AI 保存草稿");
        options.setCreateIfMissing(true);
        options.setExpectedRevision(baseRevision);

        WorkflowDslApplyService.ApplyResult result = dslApplyService.apply(workflowCode, doc, options);
        if (!result.isSuccess()) {
            if (result.isStaleRevision()) {
                return ToolResult.staleRevision(workflowCode,
                    result.getExpectedRevision(), result.getActualRevision());
            }
            return ToolResult.fail(new JSONObject().set("error", result.getError()).toString(),
                "保存失败：" + result.getError(), ToolErrorCode.INVALID_ARGS);
        }

        // 草稿元数据收口：绑定 + 新 CAS 基准 + applied 状态
        draftService.markApplied(sessionKey, workflowCode, result.getRevision());
        try {
            draftService.persistArtifact(sessionKey, "applied",
                "已落版 " + result.getVersionNumber() + " · " + result.getNodeCount() + " 节点");
        } catch (Exception e) {
            log.debug("[tool:save_workflow] artifact status update failed: {}", e.getMessage());
        }
        draftService.emitDocument(context, sessionKey);

        log.info("[tool:save_workflow] {} → {} ({} nodes)",
            workflowCode, result.getVersionNumber(), result.getNodeCount());
        JSONObject payload = new JSONObject()
            .set("success", true)
            .set("workflowCode", workflowCode)
            .set("versionNumber", result.getVersionNumber())
            .set("revision", result.getRevision())
            .set("nodeCount", result.getNodeCount())
            .set("workflowCreated", result.isWorkflowCreated());
        if (result.getRepairs() != null && !result.getRepairs().isEmpty()) {
            payload.set("repairs", result.getRepairs());
        }
        if (result.getWarnings() != null && !result.getWarnings().isEmpty()) {
            payload.set("warnings", result.getWarnings());
        }
        return ToolResult.ok(payload.toString(),
            "已保存工作流 " + workflowCode + " " + result.getVersionNumber()
                + (isNew ? "（新建）" : ""));
    }
}
