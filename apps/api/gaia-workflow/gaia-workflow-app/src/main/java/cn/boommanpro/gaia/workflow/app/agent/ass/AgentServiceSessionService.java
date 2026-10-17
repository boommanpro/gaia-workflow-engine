package cn.boommanpro.gaia.workflow.app.agent.ass;

import cn.boommanpro.gaia.workflow.app.service.AgentProviderConfigService;
import cn.boommanpro.gaia.workflow.infra.manage.entity.AgentSession;
import cn.boommanpro.gaia.workflow.infra.manage.service.AgentSessionService;
import cn.hutool.json.JSONObject;
import cn.hutool.json.JSONUtil;
import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.function.Supplier;

/**
 * AgentScope Service 会话映射 —— 本地 {@code agent_session.session_key} ↔ Service
 * {@code agent-sessions UUID} 的双向绑定与用量落库。与 {@code ArkAgentSessionService}
 * 同构，引擎标记为 {@code as-service}。
 */
@Slf4j
@Service
public class AgentServiceSessionService {

    private final AgentSessionService sessionService;

    public AgentServiceSessionService(AgentSessionService sessionService) {
        this.sessionService = sessionService;
    }

    /** 读取本地会话行（可为 null：会话尚未落库） */
    public AgentSession findByKey(String sessionKey) {
        if (sessionKey == null || sessionKey.isEmpty()) {
            return null;
        }
        return sessionService.getOne(new QueryWrapper<AgentSession>().eq("session_key", sessionKey));
    }

    /**
     * 确保本地会话已绑定 Service Session：已绑定直接复用；否则用给定创建器新建并落库。
     */
    public String ensureRemoteSession(String sessionKey, String agentId,
                                      Supplier<String> remoteSessionCreator) {
        AgentSession row = findByKey(sessionKey);
        if (row != null && row.getRemoteSessionId() != null && !row.getRemoteSessionId().isEmpty()) {
            return row.getRemoteSessionId();
        }
        String remoteSessionId = remoteSessionCreator.get();
        if (row == null) {
            log.warn("[ass-session] 本地会话 {} 不存在，无法绑定 Service Session {}", sessionKey, remoteSessionId);
            return remoteSessionId;
        }
        row.setEngine(AgentServiceExecutionEngine.ENGINE_ID);
        row.setRemoteSessionId(remoteSessionId);
        row.setRemoteAgentId(agentId);
        sessionService.updateById(row);
        log.info("[ass-session] session={} 绑定 Service Session {} (agent={})",
            sessionKey, remoteSessionId, agentId);
        return remoteSessionId;
    }

    /** 累加并落库 token 用量（读取-合并-写回，多轮运行各自累加） */
    public void recordUsage(String sessionKey, JSONObject usageDelta) {
        try {
            AgentSession row = findByKey(sessionKey);
            if (row == null) {
                return;
            }
            JSONObject merged = new JSONObject()
                .set("input_tokens", 0L)
                .set("output_tokens", 0L)
                .set("cache_read_input_tokens", 0L)
                .set("model_requests", 0);
            if (row.getTokenUsage() != null && !row.getTokenUsage().isEmpty()) {
                try {
                    JSONObject existing = JSONUtil.parseObj(row.getTokenUsage());
                    for (String key : existing.keySet()) {
                        merged.set(key, existing.get(key));
                    }
                } catch (Exception e) {
                    log.warn("[ass-session] 解析既有用量失败（按零重新累计）: {}", e.getMessage());
                }
            }
            for (String key : usageDelta.keySet()) {
                Object delta = usageDelta.get(key);
                if (delta instanceof Number) {
                    Object current = merged.get(key);
                    long base = current instanceof Number ? ((Number) current).longValue() : 0L;
                    merged.set(key, base + ((Number) delta).longValue());
                } else {
                    merged.set(key, delta);
                }
            }
            row.setTokenUsage(merged.toString());
            sessionService.updateById(row);
        } catch (Exception e) {
            log.warn("[ass-session] 记录用量失败 session={}: {}", sessionKey, e.getMessage());
        }
    }

    /** Service 连接参数是否可用（baseUrl / apiKey / adminPassword 齐备；托管 Agent 由 provisioning 按会话同步） */
    public boolean isAsServiceConfigured(AgentProviderConfigService.AsServiceConfig cfg) {
        return cfg != null
            && cfg.getApiKey() != null && !cfg.getApiKey().isEmpty()
            && cfg.getAdminPassword() != null && !cfg.getAdminPassword().isEmpty()
            && cfg.getBaseUrl() != null && !cfg.getBaseUrl().isEmpty();
    }

    /**
     * Gaia 会话删除时归档 Service 侧对应的托管 Agent（按会话建 Agent 的配套回收）。
     * 只处理 engine=as-service 且已绑定 remote_agent_id 的会话；任何失败仅告警不抛出
     * （本地删除不应被远端清理阻断）。归档而非删除：Service 无硬删，历史可追溯。
     */
    public void archiveRemoteAgentForSession(String sessionKey) {
        try {
            AgentSession row = findByKey(sessionKey);
            if (row == null
                || !AgentServiceExecutionEngine.ENGINE_ID.equals(row.getEngine())
                || row.getRemoteAgentId() == null || row.getRemoteAgentId().isEmpty()) {
                return;
            }
            AgentProviderConfigService.AsServiceConfig cfg = null;
            try {
                cfg = providerConfigService.getAsServiceConfig();
            } catch (Exception e) {
                log.warn("[ass-session] 读取 as-service 配置失败，跳过远端归档: {}", e.getMessage());
                return;
            }
            if (adminClient == null) {
                return;
            }
            JSONObject current = adminClient.getAgent(cfg, row.getRemoteAgentId());
            Integer version = current.getInt("version");
            JSONObject agent = current.getJSONObject("agent");
            if (version == null && agent != null) {
                version = agent.getInt("version");
            }
            JSONObject body = new JSONObject().set("status", "archived");
            if (version != null) {
                body.set("version", version);
            }
            adminClient.patchAgentStatus(cfg, row.getRemoteAgentId(), body.toString());
            log.info("[ass-session] 会话 {} 已删除，Service 托管 Agent {} 已归档", sessionKey, row.getRemoteAgentId());
        } catch (Exception e) {
            log.warn("[ass-session] 归档 Service 托管 Agent 失败（会话 {}）: {}", sessionKey, e.getMessage());
        }
    }

    /** 管理面客户端（延迟注入避免与 AdminClient 循环依赖） */
    @lombok.Setter
    @Autowired(required = false)
    private AgentServiceAdminClient adminClient;

    @Autowired(required = false)
    private AgentProviderConfigService providerConfigService;
}
