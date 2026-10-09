package cn.boommanpro.gaia.workflow.app.agent.session;

import cn.hutool.json.JSONArray;
import cn.hutool.json.JSONObject;
import cn.hutool.json.JSONUtil;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;

/**
 * 会话级执行计划存储 —— createPlan / executeStep 的后端状态。
 *
 * <p>旧链路里 activePlan（todo 机制）存在前端 React 状态里，刷新即丢。
 * 这里按会话存在后端（内存缓存 + {@code agent_artifact} 表持久化，
 * type=plan），多窗口共享同一份计划，刷新 / 关窗 / 重启都能继续。
 * 每次保存都会广播 {@code artifact} 事件（type=plan）。</p>
 */
@Slf4j
@Component
public class SessionPlanStore {

    private final ConcurrentMap<String, JSONObject> plans = new ConcurrentHashMap<>();

    private final SessionArtifactStore artifactStore;

    public SessionPlanStore(SessionArtifactStore artifactStore) {
        this.artifactStore = artifactStore;
    }

    /** 读取会话的当前计划（无则 null）。缓存未命中时从产物表恢复（重启不丢计划） */
    public JSONObject get(String sessionKey) {
        if (sessionKey == null) {
            return null;
        }
        JSONObject cached = plans.get(sessionKey);
        if (cached != null) {
            return cached;
        }
        cn.boommanpro.gaia.workflow.infra.manage.entity.AgentArtifact artifact =
            artifactStore.getLatest(sessionKey, SessionArtifactStore.TYPE_PLAN);
        if (artifact != null && artifact.getPayload() != null) {
            try {
                JSONObject restored = JSONUtil.parseObj(artifact.getPayload());
                if (restored.containsKey("id") && restored.containsKey("steps")) {
                    plans.put(sessionKey, restored);
                    log.info("[plan] {} restored from artifact (v{})", sessionKey, artifact.getVersion());
                    return restored;
                }
            } catch (Exception e) {
                log.warn("[plan] restore from artifact failed: {} — {}", sessionKey, e.getMessage());
            }
        }
        return null;
    }

    /** 保存 / 更新计划（内容更新 = artifact version 递增 + artifact 事件广播） */
    public void save(String sessionKey, JSONObject plan) {
        if (sessionKey == null || plan == null) {
            return;
        }
        plans.put(sessionKey, plan);
        JSONArray steps = plan.getJSONArray("steps");
        int total = steps != null ? steps.size() : 0;
        int done = 0;
        if (steps != null) {
            for (int i = 0; i < steps.size(); i++) {
                JSONObject step = steps.getJSONObject(i);
                if (step != null && "done".equals(step.getStr("status"))) {
                    done++;
                }
            }
        }
        artifactStore.upsertSessionScoped(sessionKey, null, SessionArtifactStore.TYPE_PLAN,
            "stable", "执行计划", total > 0 ? (done + "/" + total + " 步完成") : null, plan);
    }

    /** 清除计划（产物标记为 discarded，可追溯） */
    public void clear(String sessionKey) {
        if (sessionKey == null) {
            return;
        }
        plans.remove(sessionKey);
        artifactStore.updateStatus(sessionKey, SessionArtifactStore.TYPE_PLAN, "discarded");
    }
}
