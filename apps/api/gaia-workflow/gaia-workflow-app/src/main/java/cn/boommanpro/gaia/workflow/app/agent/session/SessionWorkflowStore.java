package cn.boommanpro.gaia.workflow.app.agent.session;

import cn.boommanpro.gaia.workflow.infra.manage.entity.GaiaWorkflow;
import cn.boommanpro.gaia.workflow.infra.manage.entity.GaiaWorkflowVersion;
import cn.boommanpro.gaia.workflow.infra.manage.service.GaiaWorkflowService;
import cn.boommanpro.gaia.workflow.infra.manage.service.GaiaWorkflowVersionService;
import cn.hutool.json.JSONObject;
import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.UpdateWrapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Objects;

/**
 * 会话草稿工作流 —— 每段会话的草稿在 gaia_workflow 里拥有自己的一行（source=session，
 * code 固定为 {@code draft_<sessionKey>}），草稿内容作为该行唯一的 {@code draft} 版本随每次变更实时同步。
 *
 * <p>这样草稿与正式工作流走同一套表与执行链路（run / 测试用例 / 版本），只是不进工作流列表；
 * 用户「保存为版本」仍发布到绑定的正式 code 或新建 wf_xxx，草稿行保持为会话的工作副本。</p>
 */
@Slf4j
@Service
public class SessionWorkflowStore {

    public static final String SOURCE_SESSION = "session";
    public static final String CODE_PREFIX = "draft_";
    public static final String DRAFT_VERSION = "draft";

    private final GaiaWorkflowService workflowService;
    private final GaiaWorkflowVersionService versionService;

    public SessionWorkflowStore(GaiaWorkflowService workflowService, GaiaWorkflowVersionService versionService) {
        this.workflowService = workflowService;
        this.versionService = versionService;
    }

    /** 会话草稿的 workflow_code（测试用例 / 执行日志 / 版本都挂在它上面） */
    public static String sessionCode(String sessionKey) {
        return CODE_PREFIX + sessionKey;
    }

    public static boolean isSessionCode(String workflowCode) {
        return workflowCode != null && workflowCode.startsWith(CODE_PREFIX);
    }

    /**
     * 把草稿同步为会话工作流的 draft 版本（幂等 upsert；内容未变不写库）。
     * 失败只记日志：草稿本身仍在内存 + 产物表，不能因为镜像落库失败打断画布操作。
     */
    public void syncDraft(String sessionKey, JSONObject publicDoc) {
        if (sessionKey == null || publicDoc == null) {
            return;
        }
        try {
            String code = sessionCode(sessionKey);
            String data = publicDoc.toString();
            LocalDateTime now = LocalDateTime.now();

            GaiaWorkflow workflow = workflowService.getOne(
                new QueryWrapper<GaiaWorkflow>().eq("workflow_code", code).last("LIMIT 1"));
            if (workflow == null) {
                workflow = new GaiaWorkflow();
                workflow.setWorkflowCode(code);
                workflow.setWorkflowName("会话草稿 " + shortKey(sessionKey));
                workflow.setWorkflowDesc("对话 " + sessionKey + " 的工作草稿，随对话实时同步；不进工作流列表");
                workflow.setSource(SOURCE_SESSION);
                workflow.setRevision(0L);
                workflow.setCreatedAt(now);
                workflow.setUpdatedAt(now);
                workflowService.save(workflow);
            }

            GaiaWorkflowVersion version = versionService.getOne(
                new QueryWrapper<GaiaWorkflowVersion>()
                    .eq("workflow_code", code).eq("version_number", DRAFT_VERSION).last("LIMIT 1"));
            boolean changed;
            if (version == null) {
                version = new GaiaWorkflowVersion();
                version.setWorkflowCode(code);
                version.setVersionNumber(DRAFT_VERSION);
                version.setVersionDesc("会话草稿（随对话实时同步）");
                version.setWorkflowData(data);
                version.setCreatedBy("agent");
                version.setIsCurrent(1);
                version.setCreatedAt(now);
                versionService.save(version);
                changed = true;
            } else {
                changed = !data.equals(version.getWorkflowData());
                if (changed) {
                    version.setWorkflowData(data);
                    version.setIsCurrent(1);
                    versionService.updateById(version);
                }
            }

            if (!Objects.equals(workflow.getCurrentVersionId(), version.getId()) || changed) {
                workflow.setCurrentVersionId(version.getId());
                workflow.setUpdatedAt(now);
                workflowService.updateById(workflow);
            }
        } catch (Exception e) {
            log.warn("[session-workflow] sync {} failed: {}", sessionKey, e.getMessage());
        }
    }

    /** 会话删除时连带软删草稿工作流（幂等；版本行与用例按 code 留档，不再可见） */
    public void dropSession(String sessionKey) {
        if (sessionKey == null) {
            return;
        }
        try {
            workflowService.update(new UpdateWrapper<GaiaWorkflow>()
                .eq("workflow_code", sessionCode(sessionKey))
                .eq("source", SOURCE_SESSION)
                .set("is_deleted", 1)
                .set("updated_at", LocalDateTime.now()));
        } catch (Exception e) {
            log.warn("[session-workflow] drop {} failed: {}", sessionKey, e.getMessage());
        }
    }

    private static String shortKey(String sessionKey) {
        return sessionKey.length() > 8 ? sessionKey.substring(0, 8) : sessionKey;
    }
}
