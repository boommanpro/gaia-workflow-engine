package cn.boommanpro.gaia.workflow.app.agent.core;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Agent 注册中心（Registry 模式 + 策略路由）。
 *
 * <p>支持<strong>运行时热插拔</strong>：
 * register / unregister / replace 立即生效，不需要重启，也不影响正在跑的任务
 * （已持引用的运行不受影响，新的运行看到最新集合）。</p>
 *
 * <p>路由采用「显式指定优先 + supports 过滤 + sortOrder 兜底」的三级策略，
 * 取代原先散落在业务代码里的判断。</p>
 */
@Slf4j
@Component
public class AgentRegistry {

    private final Map<String, Agent> agents = new ConcurrentHashMap<>();

    /**
     * 注册（或替换）一个 Agent。
     *
     * @return 被替换掉的旧 Agent，没有则返回 empty
     */
    public Optional<Agent> register(Agent agent) {
        if (agent == null || agent.getId() == null) {
            throw new IllegalArgumentException("agent and agent.id must not be null");
        }
        Agent previous = agents.put(agent.getId(), agent);
        log.info("[agent-registry] registered agent '{}' ({}) source={}, previous={}",
            agent.getId(),
            agent.getDefinition() != null ? agent.getDefinition().getName() : "-",
            agent.getDefinition() != null ? agent.getDefinition().getSource() : "-",
            previous != null ? "replaced" : "new");
        return Optional.ofNullable(previous);
    }

    /** 卸载一个 Agent */
    public Optional<Agent> unregister(String agentId) {
        Agent removed = agents.remove(agentId);
        if (removed != null) {
            log.info("[agent-registry] unregistered agent '{}'", agentId);
        }
        return Optional.ofNullable(removed);
    }

    public Optional<Agent> get(String agentId) {
        return agentId == null ? Optional.empty() : Optional.ofNullable(agents.get(agentId));
    }

    /** 按 sortOrder 排序后的全部 Agent */
    public List<Agent> listAll() {
        List<Agent> list = new ArrayList<>(agents.values());
        list.sort(Comparator.comparingInt(a -> a.getDefinition() != null ? a.getDefinition().getSortOrder() : 100));
        return Collections.unmodifiableList(list);
    }

    /** 只看启用的 */
    public List<Agent> listEnabled() {
        List<Agent> result = new ArrayList<>();
        for (Agent agent : listAll()) {
            if (agent.getDefinition() != null && agent.getDefinition().isEnabled()) {
                result.add(agent);
            }
        }
        return Collections.unmodifiableList(result);
    }

    /**
     * 为请求挑选合适的 Agent。
     * 显式指定 → supports 过滤 → sortOrder 最小的那个。
     */
    public Optional<Agent> route(AgentRequest request) {
        String explicitId = request != null ? request.getAgentId() : null;
        if (explicitId != null && !explicitId.isEmpty()) {
            Optional<Agent> explicit = get(explicitId);
            if (explicit.isPresent()) {
                return explicit;
            }
            log.warn("[agent-registry] requested agent '{}' not found, falling back to routing", explicitId);
        }
        for (Agent agent : listEnabled()) {
            try {
                if (agent.supports(request)) {
                    return Optional.of(agent);
                }
            } catch (Exception e) {
                log.warn("[agent-registry] agent '{}' supports() threw: {}", agent.getId(), e.getMessage());
            }
        }
        return Optional.empty();
    }

    /** 导出全部定义快照，供管理接口展示 */
    public Map<String, AgentDefinition> snapshotDefinitions() {
        Map<String, AgentDefinition> snapshot = new LinkedHashMap<>();
        listAll().forEach(a -> snapshot.put(a.getId(), a.getDefinition()));
        return snapshot;
    }

    public int size() {
        return agents.size();
    }
}
