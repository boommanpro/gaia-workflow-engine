package cn.boommanpro.gaia.workflow.app.agent.ark;

import cn.boommanpro.gaia.workflow.app.service.AgentProviderConfigService;
import cn.boommanpro.gaia.workflow.infra.manage.entity.AgentSession;
import cn.boommanpro.gaia.workflow.infra.manage.service.AgentSessionService;
import cn.hutool.json.JSONObject;
import cn.hutool.json.JSONUtil;
import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.function.Supplier;

/**
 * 方舟会话映射 —— 本地 {@code agent_session.session_key} ↔ 方舟 {@code sesn-*} 的双向绑定与用量落库。
 *
 * <p>映射关系持久在 {@code agent_session} 的新增列中（engine / remote_session_id /
 * remote_agent_id / remote_agent_version / token_usage）。方舟 Session 自身维护对话历史
 * 与沙箱快照（idle 快照保留 14 天），本地库是供控制台使用的镜像投影。</p>
 */
@Slf4j
@Service
public class ArkAgentSessionService {

    private final AgentSessionService sessionService;

    public ArkAgentSessionService(AgentSessionService sessionService) {
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
     * 确保本地会话已绑定方舟 Session：已绑定直接复用；否则用给定创建器新建并落库。
     * 绑定快照（remoteAgentId/version）取运行时解析结果（手动绑定值或自动同步产物）。
     * 创建器抛出异常时原样向上传递（引擎会转为运行错误）。
     */
    public String ensureRemoteSession(String sessionKey, String agentId, Integer agentVersion,
                                      Supplier<String> remoteSessionCreator) {
        AgentSession row = findByKey(sessionKey);
        if (row != null && row.getRemoteSessionId() != null && !row.getRemoteSessionId().isEmpty()) {
            return row.getRemoteSessionId();
        }
        String remoteSessionId = remoteSessionCreator.get();
        if (row == null) {
            log.warn("[ark-session] 本地会话 {} 不存在，无法绑定方舟 Session {}", sessionKey, remoteSessionId);
            return remoteSessionId;
        }
        row.setEngine("ark");
        row.setRemoteSessionId(remoteSessionId);
        row.setRemoteAgentId(agentId);
        row.setRemoteAgentVersion(agentVersion);
        sessionService.updateById(row);
        log.info("[ark-session] session={} 绑定方舟 Session {} (agent={} v{})",
            sessionKey, remoteSessionId, agentId,
            agentVersion != null ? agentVersion : "latest");
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
                .set("cache_creation_input_tokens", 0L)
                .set("model_requests", 0);
            if (row.getTokenUsage() != null && !row.getTokenUsage().isEmpty()) {
                try {
                    JSONObject existing = JSONUtil.parseObj(row.getTokenUsage());
                    for (String key : existing.keySet()) {
                        merged.set(key, existing.get(key));
                    }
                } catch (Exception e) {
                    log.warn("[ark-session] 解析既有用量失败（按零重新累计）: {}", e.getMessage());
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
            log.warn("[ark-session] 记录用量失败 session={}: {}", sessionKey, e.getMessage());
        }
    }

    /** 方舟连接参数是否可用（apiKey / environmentId 齐备） */
    public boolean isArkConfigured(AgentProviderConfigService.ArkConfig cfg) {
        return cfg != null
            && cfg.getApiKey() != null && !cfg.getApiKey().isEmpty()
            && cfg.getEnvironmentId() != null && !cfg.getEnvironmentId().isEmpty();
    }
}
