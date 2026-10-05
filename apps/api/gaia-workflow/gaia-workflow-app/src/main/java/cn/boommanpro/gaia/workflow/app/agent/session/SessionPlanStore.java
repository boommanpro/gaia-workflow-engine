package cn.boommanpro.gaia.workflow.app.agent.session;

import cn.hutool.json.JSONObject;
import org.springframework.stereotype.Component;

import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;

/**
 * 会话级执行计划存储 —— createPlan / executeStep 的后端状态。
 *
 * <p>旧链路里 activePlan（todo 机制）存在前端 React 状态里，刷新即丢。
 * 这里按会话存在后端，多窗口共享同一份计划，刷新 / 关窗都能继续。</p>
 */
@Component
public class SessionPlanStore {

    private final ConcurrentMap<String, JSONObject> plans = new ConcurrentHashMap<>();

    /** 读取会话的当前计划（无则 null） */
    public JSONObject get(String sessionKey) {
        if (sessionKey == null) {
            return null;
        }
        return plans.get(sessionKey);
    }

    /** 保存 / 更新计划 */
    public void save(String sessionKey, JSONObject plan) {
        if (sessionKey == null) {
            return;
        }
        plans.put(sessionKey, plan);
    }

    /** 清除计划 */
    public void clear(String sessionKey) {
        if (sessionKey == null) {
            return;
        }
        plans.remove(sessionKey);
    }
}
