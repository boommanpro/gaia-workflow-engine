package cn.boommanpro.gaia.workflow.app.agent.session;

import cn.boommanpro.gaia.workflow.app.service.WorkflowDslApplyService;
import cn.boommanpro.gaia.workflow.infra.manage.entity.GaiaWorkflow;
import cn.boommanpro.gaia.workflow.infra.manage.service.GaiaWorkflowService;
import cn.hutool.json.JSONObject;
import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.UUID;

/**
 * 会话草稿落版服务 —— 「保存为版本」的唯一入口，只由用户界面操作触发
 * （对话页「保存为版本」按钮 / POST /agent/session/{key}/save）。
 *
 * <p>2026-10-11 语义变更：AI 没有 save_workflow 工具了——AI 产出的工作流与对话绑定
 * （会话草稿），持久化是用户动作。原 SaveWorkflowToolExecutor 的落版逻辑整体迁到这里。</p>
 */
@Slf4j
@Service
public class SessionDraftPublishService {

    private final SessionWorkflowDraftService draftService;
    private final WorkflowDslApplyService dslApplyService;
    private final GaiaWorkflowService workflowService;

    public SessionDraftPublishService(SessionWorkflowDraftService draftService,
                                      WorkflowDslApplyService dslApplyService,
                                      GaiaWorkflowService workflowService) {
        this.draftService = draftService;
        this.dslApplyService = dslApplyService;
        this.workflowService = workflowService;
    }

    /** 落版结果（message 给前端 toast/卡片用） */
    public static class PublishResult {
        public boolean success;
        public String error;
        public String message;
        public JSONObject payload = new JSONObject();
    }

    /**
     * 把会话草稿落为工作流版本。
     *
     * @param sessionKey 会话
     * @param workflowCode 目标工作流编码（可空 = 草稿绑定的；仍为空则生成新编码）
     * @param name 工作流名（可空）
     * @param versionDesc 版本描述（可空）
     * @param baseRevision CAS 基准（可空 = 草稿记录的基准）
     */
    public PublishResult publish(String sessionKey, String workflowCode, String name,
                                 String versionDesc, Long baseRevision) {
        PublishResult result = new PublishResult();
        String code = (workflowCode == null || workflowCode.isEmpty())
            ? draftService.getBoundCode(sessionKey) : workflowCode;

        JSONObject doc = draftService.publicDoc(sessionKey);
        if (doc == null || doc.getJSONArray("nodes") == null || doc.getJSONArray("nodes").isEmpty()) {
            result.error = "当前对话还没有工作流草稿，无法保存";
            return result;
        }

        boolean isNew = false;
        if (code == null || code.isEmpty()) {
            code = "wf_" + UUID.randomUUID().toString().replace("-", "").substring(0, 12);
            isNew = true;
            baseRevision = null; // 新建无基准
        } else if (baseRevision == null) {
            GaiaWorkflow existing = workflowService.getOne(
                new QueryWrapper<GaiaWorkflow>().eq("workflow_code", code).last("LIMIT 1"));
            if (existing == null) {
                isNew = true;
            } else {
                // 用户动作以服务端当前值为基准放行，保持向后兼容
                baseRevision = existing.getRevision() != null ? existing.getRevision() : 0L;
            }
        }

        WorkflowDslApplyService.ApplyOptions options = new WorkflowDslApplyService.ApplyOptions();
        options.setWorkflowName(name);
        options.setWorkflowDesc(null);
        options.setVersionDesc(versionDesc != null ? versionDesc : "用户保存为版本");
        options.setCreateIfMissing(true);
        options.setExpectedRevision(baseRevision);

        WorkflowDslApplyService.ApplyResult apply = dslApplyService.apply(code, doc, options);
        if (!apply.isSuccess()) {
            if (apply.isStaleRevision()) {
                result.error = "工作流已被其他修改更新（基准 " + apply.getExpectedRevision()
                    + "，当前 " + apply.getActualRevision() + "），请刷新后基于最新版本重试";
                return result;
            }
            result.error = "保存失败：" + apply.getError();
            return result;
        }

        draftService.markApplied(sessionKey, code, apply.getRevision());
        try {
            draftService.persistArtifact(sessionKey, "applied",
                "已落版 " + apply.getVersionNumber() + " · " + apply.getNodeCount() + " 节点");
        } catch (Exception e) {
            log.debug("[draft-publish] artifact status update failed: {}", e.getMessage());
        }

        log.info("[draft-publish] {} → {} ({} nodes)", code, apply.getVersionNumber(), apply.getNodeCount());
        result.success = true;
        result.payload
            .set("workflowCode", code)
            .set("versionNumber", apply.getVersionNumber())
            .set("revision", apply.getRevision())
            .set("nodeCount", apply.getNodeCount())
            .set("workflowCreated", apply.isWorkflowCreated());
        result.message = "已保存 " + code + " " + apply.getVersionNumber()
            + (isNew ? "（新建工作流）" : "");
        return result;
    }
}
