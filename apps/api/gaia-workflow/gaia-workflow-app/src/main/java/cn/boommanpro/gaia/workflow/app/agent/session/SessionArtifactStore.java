package cn.boommanpro.gaia.workflow.app.agent.session;

import cn.boommanpro.gaia.workflow.infra.manage.entity.AgentArtifact;
import cn.boommanpro.gaia.workflow.infra.manage.service.AgentArtifactService;
import cn.hutool.json.JSONObject;
import cn.hutool.json.JSONUtil;
import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

/**
 * 会话产物存储 —— Artifact 体系的核心。
 *
 * <p>产物是一等实体：有稳定 identity（artifact_key）、有状态机、有版本，
 * 持久化在 {@code agent_artifact} 表，每次变更经 {@code artifact} 事件广播给
 * 所有订阅窗口（多窗口一致；断线重连由事件缓冲回放 + GET /artifacts 兜底）。</p>
 *
 * <p>两种生命周期：</p>
 * <ul>
 *   <li><b>会话级 upsert</b>（workflow / plan）：一个会话一行，内容更新 = version 递增；
 *       重启后从 DB 恢复，这是「草稿/计划不再丢」的关键。</li>
 *   <li><b>追加式</b>（test_report / release）：每次产生新行，是可追溯的证据链。</li>
 * </ul>
 *
 * <p>产物写库/广播遵循「不拖垮主流程」：任何失败只告警，不向工具执行抛错。</p>
 */
@Slf4j
@Component
public class SessionArtifactStore {

    public static final String TYPE_WORKFLOW = "workflow";
    public static final String TYPE_PLAN = "plan";
    public static final String TYPE_TEST_REPORT = "test_report";
    public static final String TYPE_RELEASE = "release";

    private final AgentArtifactService artifactService;
    private final SessionEventBus eventBus;

    public SessionArtifactStore(AgentArtifactService artifactService, SessionEventBus eventBus) {
        this.artifactService = artifactService;
        this.eventBus = eventBus;
    }

    // ---------------- 写入 ----------------

    /**
     * 会话级 upsert：同会话同 type 只保留一行，内容更新 version 递增。
     *
     * @return 落库后的实体，失败返回 null
     */
    public AgentArtifact upsertSessionScoped(String sessionKey, String runId, String type,
                                             String status, String title, String summary,
                                             JSONObject payload) {
        if (sessionKey == null || sessionKey.isEmpty() || type == null) {
            return null;
        }
        try {
            String artifactKey = sessionKey + ":" + type;
            AgentArtifact existing = getByKey(artifactKey);
            LocalDateTime now = LocalDateTime.now();
            AgentArtifact entity;
            if (existing != null) {
                entity = existing;
                entity.setStatus(status);
                entity.setTitle(title);
                entity.setSummary(summary);
                entity.setPayload(payload != null ? payload.toString() : "{}");
                entity.setVersion((existing.getVersion() == null ? 1 : existing.getVersion()) + 1);
                entity.setUpdatedAt(now);
                if (runId != null) {
                    entity.setRunId(runId);
                }
                artifactService.updateById(entity);
            } else {
                entity = new AgentArtifact();
                entity.setArtifactKey(artifactKey);
                entity.setSessionKey(sessionKey);
                entity.setRunId(runId);
                entity.setType(type);
                entity.setStatus(status);
                entity.setTitle(title);
                entity.setSummary(summary);
                entity.setPayload(payload != null ? payload.toString() : "{}");
                entity.setVersion(1);
                entity.setCreatedAt(now);
                entity.setUpdatedAt(now);
                entity.setIsDeleted(0);
                artifactService.save(entity);
            }
            emitUpsert(entity);
            return entity;
        } catch (Exception e) {
            log.warn("[artifact] upsert failed: session={} type={} error={}", sessionKey, type, e.getMessage());
            return null;
        }
    }

    /** 追加式产物：test_report / release 每次产生新行 */
    public AgentArtifact appendArtifact(String sessionKey, String runId, String type,
                                        String status, String title, String summary,
                                        JSONObject payload) {
        if (sessionKey == null || sessionKey.isEmpty() || type == null) {
            return null;
        }
        try {
            LocalDateTime now = LocalDateTime.now();
            AgentArtifact entity = new AgentArtifact();
            entity.setArtifactKey("art_" + UUID.randomUUID().toString().replace("-", "").substring(0, 16));
            entity.setSessionKey(sessionKey);
            entity.setRunId(runId);
            entity.setType(type);
            entity.setStatus(status);
            entity.setTitle(title);
            entity.setSummary(summary);
            entity.setPayload(payload != null ? payload.toString() : "{}");
            entity.setVersion(1);
            entity.setCreatedAt(now);
            entity.setUpdatedAt(now);
            entity.setIsDeleted(0);
            artifactService.save(entity);
            emitUpsert(entity);
            return entity;
        } catch (Exception e) {
            log.warn("[artifact] append failed: session={} type={} error={}", sessionKey, type, e.getMessage());
            return null;
        }
    }

    /** 仅迁移状态（applied / discarded 等），不更新内容；仅对会话级产物有意义 */
    public boolean updateStatus(String sessionKey, String type, String status) {
        if (sessionKey == null || type == null) {
            return false;
        }
        try {
            AgentArtifact entity = getByKey(sessionKey + ":" + type);
            if (entity == null) {
                return false;
            }
            entity.setStatus(status);
            entity.setUpdatedAt(LocalDateTime.now());
            artifactService.updateById(entity);
            emitState(entity);
            return true;
        } catch (Exception e) {
            log.warn("[artifact] updateStatus failed: session={} type={} error={}", sessionKey, type, e.getMessage());
            return false;
        }
    }

    // ---------------- 读取 ----------------

    /** 会话的产物列表（按更新时间升序，稳定回放顺序） */
    public List<AgentArtifact> listBySession(String sessionKey) {
        if (sessionKey == null || sessionKey.isEmpty()) {
            return List.of();
        }
        try {
            return artifactService.list(new QueryWrapper<AgentArtifact>()
                .eq("session_key", sessionKey)
                .orderByAsc("updated_at")
                .last("LIMIT 200"));
        } catch (Exception e) {
            log.warn("[artifact] list failed: session={} error={}", sessionKey, e.getMessage());
            return List.of();
        }
    }

    /** 会话内某 type 的当前产物（会话级 upsert 语义下的唯一一行） */
    public AgentArtifact getLatest(String sessionKey, String type) {
        if (sessionKey == null || sessionKey.isEmpty() || type == null) {
            return null;
        }
        return getByKey(sessionKey + ":" + type);
    }

    // ---------------- 广播 ----------------

    private void emitUpsert(AgentArtifact entity) {
        if (entity == null || entity.getSessionKey() == null) {
            return;
        }
        try {
            eventBus.publish(entity.getSessionKey(), "artifact", new JSONObject()
                .set("action", "upsert")
                .set("artifact", toPublicJson(entity)));
        } catch (Exception e) {
            log.warn("[artifact] emit failed: session={} error={}", entity.getSessionKey(), e.getMessage());
        }
    }

    private void emitState(AgentArtifact entity) {
        if (entity == null || entity.getSessionKey() == null) {
            return;
        }
        try {
            eventBus.publish(entity.getSessionKey(), "artifact", new JSONObject()
                .set("action", "state")
                .set("artifactKey", entity.getArtifactKey())
                .set("status", entity.getStatus()));
        } catch (Exception e) {
            log.warn("[artifact] emit state failed: session={} error={}", entity.getSessionKey(), e.getMessage());
        }
    }

    // ---------------- 内部 ----------------

    private AgentArtifact getByKey(String artifactKey) {
        return artifactService.getOne(new QueryWrapper<AgentArtifact>()
            .eq("artifact_key", artifactKey)
            .last("LIMIT 1"));
    }

    /** 对外（事件/接口）形态：payload 解析为 JSON 对象，时间统一 ISO 字符串 */
    public static JSONObject toPublicJson(AgentArtifact entity) {
        JSONObject json = new JSONObject()
            .set("artifactKey", entity.getArtifactKey())
            .set("sessionKey", entity.getSessionKey())
            .set("type", entity.getType())
            .set("status", entity.getStatus())
            .set("title", entity.getTitle())
            .set("summary", entity.getSummary())
            .set("version", entity.getVersion());
        if (entity.getRunId() != null) {
            json.set("runId", entity.getRunId());
        }
        try {
            json.set("payload", JSONUtil.parseObj(entity.getPayload() != null ? entity.getPayload() : "{}"));
        } catch (Exception e) {
            json.set("payload", new JSONObject());
        }
        if (entity.getCreatedAt() != null) {
            json.set("createdAt", entity.getCreatedAt().toString());
        }
        if (entity.getUpdatedAt() != null) {
            json.set("updatedAt", entity.getUpdatedAt().toString());
        }
        return json;
    }
}
