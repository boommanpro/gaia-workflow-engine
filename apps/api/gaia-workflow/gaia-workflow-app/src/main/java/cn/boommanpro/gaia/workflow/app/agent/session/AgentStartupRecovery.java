package cn.boommanpro.gaia.workflow.app.agent.session;

import cn.boommanpro.gaia.workflow.app.agent.core.ConversationStore;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;

/**
 * 启动归位组件（对齐 dsh 崩溃恢复的「合成 interrupted 标记」语义）。
 *
 * <p>进程死亡时在跑的 run 来不及写终态事件：事件日志里最后一个 run 没有
 * {@code run_end}。重启后这里为其补写一条 {@code run_interrupted} 事件，
 * 并落一条 assistant 消息——用户回来能明确看出「上一次运行被打断」，
 * 而不是面对一条凭空消失的对话。</p>
 */
@Slf4j
@Component
public class AgentStartupRecovery {

    private final JdbcTemplate jdbc;
    private final ConversationStore conversationStore;

    public AgentStartupRecovery(JdbcTemplate jdbc, ConversationStore conversationStore) {
        this.jdbc = jdbc;
        this.conversationStore = conversationStore;
    }

    @EventListener(ApplicationReadyEvent.class)
    public void recoverInterruptedRuns() {
        try {
            String epoch = ensureEpoch();
            if (epoch == null) {
                // 首次部署：只立纪元不回溯 —— run_end 事件是本版本引入的，
                // 历史 run 一律没有终态事件，回溯会把正常完成的会话全标成「被中断」
                return;
            }
            List<Map<String, Object>> sessions = jdbc.queryForList(
                "SELECT DISTINCT session_key FROM agent_session_event WHERE created_at > ?", epoch);
            int recovered = 0;
            for (Map<String, Object> row : sessions) {
                String sessionKey = String.valueOf(row.get("session_key"));
                String runId = latestRunId(sessionKey);
                if (runId == null || hasTerminalEvent(sessionKey, runId)) {
                    continue;
                }
                jdbc.update("INSERT INTO agent_session_event "
                        + "(session_key, run_id, seq, event_type, payload, created_at) VALUES (?, ?, ?, ?, ?, ?)",
                    sessionKey, runId, nextSeq(sessionKey, runId), "run_interrupted",
                    "{\"reason\":\"process restart\"}", String.valueOf(java.time.LocalDateTime.now()));
                conversationStore.saveMessage(sessionKey, "assistant",
                    "⏸ 上一次运行因服务重启被中断。已完成的草稿与已落版版本保持有效，可重新发送消息继续。",
                    null, null);
                recovered++;
            }
            if (recovered > 0) {
                log.info("[startup-recovery] marked {} interrupted run(s) across {} candidate session(s)",
                    recovered, sessions.size());
            }
        } catch (Exception e) {
            log.warn("[startup-recovery] skipped (non-sqlite or failed): {}", e.getMessage());
        }
    }

    /**
     * 恢复纪元：agent_config 里记录的首次部署时刻。
     * 存在 → 返回之（只恢复纪元之后的 run）；不存在 → 写入并返回 null（本次不回溯）。
     */
    private String ensureEpoch() {
        Integer existing = jdbc.queryForObject(
            "SELECT COUNT(*) FROM agent_config WHERE config_key = 'agent.recovery.epoch'", Integer.class);
        if (existing != null && existing > 0) {
            return jdbc.queryForObject(
                "SELECT content FROM agent_config WHERE config_key = 'agent.recovery.epoch'", String.class);
        }
        String now = String.valueOf(java.time.LocalDateTime.now());
        jdbc.update("INSERT INTO agent_config (config_key, config_type, title, content, description, created_at, updated_at) "
                + "VALUES ('agent.recovery.epoch', 'migration_marker', '中断恢复纪元', ?, '此时刻之后的 run 才参与启动归位；历史 run 不回溯', datetime('now'), datetime('now'))",
            now);
        log.info("[startup-recovery] epoch established at {}, historical runs exempted", now);
        return null;
    }

    private String latestRunId(String sessionKey) {
        List<Map<String, Object>> rows = jdbc.queryForList(
            "SELECT run_id FROM agent_session_event WHERE session_key = ? ORDER BY id DESC LIMIT 1", sessionKey);
        Object runId = rows.isEmpty() ? null : rows.get(0).get("run_id");
        return runId != null ? String.valueOf(runId) : null;
    }

    private boolean hasTerminalEvent(String sessionKey, String runId) {
        Integer terminal = jdbc.queryForObject(
            "SELECT COUNT(*) FROM agent_session_event WHERE session_key = ? AND run_id = ? "
                + "AND event_type IN ('run_end', 'run_interrupted')",
            Integer.class, sessionKey, runId);
        return terminal != null && terminal > 0;
    }

    private int nextSeq(String sessionKey, String runId) {
        Integer max = jdbc.queryForObject(
            "SELECT MAX(seq) FROM agent_session_event WHERE session_key = ? AND run_id = ?",
            Integer.class, sessionKey, runId);
        return (max != null ? max : 0) + 1;
    }
}
