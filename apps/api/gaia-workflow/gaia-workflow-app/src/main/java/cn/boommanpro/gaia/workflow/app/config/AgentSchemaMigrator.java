package cn.boommanpro.gaia.workflow.app.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import javax.annotation.PostConstruct;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;

/**
 * SQLite 结构迁移器 —— 给已存在的库补 v2 列。
 *
 * <p>schema.sql 用 {@code CREATE TABLE IF NOT EXISTS}，对新建表没问题，
 * 但 SQLite 的 {@code ALTER TABLE ADD COLUMN} 没有 IF NOT EXISTS 语义，
 * 重复执行会报 duplicate column。这里启动时查 PRAGMA table_info，缺列才补。
 * 全程幂等，任何库（新/旧/非 SQLite 报错跳过）都安全。</p>
 */
@Slf4j
@Component
public class AgentSchemaMigrator {

    private final JdbcTemplate jdbc;

    public AgentSchemaMigrator(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @PostConstruct
    public void migrate() {
        try {
            addColumnIfMissing("gaia_workflow", "revision",
                "ALTER TABLE gaia_workflow ADD COLUMN revision INTEGER DEFAULT 0");
            addColumnIfMissing("gaia_workflow_version", "diff_json",
                "ALTER TABLE gaia_workflow_version ADD COLUMN diff_json TEXT");
            // 上下文压缩（surface replace）的持久化侧：被摘要覆盖的消息打标
            addColumnIfMissing("agent_message", "compacted",
                "ALTER TABLE agent_message ADD COLUMN compacted INTEGER DEFAULT 0");
            // 新表兜底（schema.sql 已建，这里防的是 init 顺序问题）
            createTableIfMissing("agent_session_event",
                "CREATE TABLE agent_session_event ("
                    + "id INTEGER PRIMARY KEY AUTOINCREMENT, "
                    + "session_key VARCHAR(64) NOT NULL, run_id VARCHAR(64), "
                    + "seq INTEGER NOT NULL, event_type VARCHAR(48) NOT NULL, "
                    + "payload TEXT, created_at TEXT)");
            createTableIfMissing("agent_tool_call_log",
                "CREATE TABLE agent_tool_call_log ("
                    + "id INTEGER PRIMARY KEY AUTOINCREMENT, "
                    + "session_key VARCHAR(64) NOT NULL, run_id VARCHAR(64), turn INTEGER, "
                    + "tool_name VARCHAR(128) NOT NULL, outcome VARCHAR(32) NOT NULL, "
                    + "error_code VARCHAR(32), duration_ms BIGINT, args_digest TEXT, created_at TEXT)");
            log.info("[schema-migrator] sqlite schema up to date");
        } catch (Exception e) {
            log.warn("[schema-migrator] migration skipped (non-sqlite or failed): {}", e.getMessage());
        }
    }

    /**
     * v2 提示词一次性覆盖：DB 里的旧提示词描述的是 v1 工具（applyWorkflow/canvas 等），
     * 与 v2 工具链对不上会把模型带偏。这里以 marker（agent.prompt.v2_applied）保证只覆盖一次，
     * 之后管理后台的修改永远不会再被启动流程覆盖。
     */
    @PostConstruct
    public void migratePrompts() {
        try {
            Integer marker = jdbc.queryForObject(
                "SELECT COUNT(*) FROM agent_config WHERE config_key = 'agent.prompt.v2_applied'",
                Integer.class);
            if (marker != null && marker > 0) {
                return;
            }
            overwritePrompt("system_prompt.default", "agent/prompt-zh.md");
            overwritePrompt("system_prompt.default.en", "agent/prompt-en.md");
            overwritePrompt("system_prompt.workflow-architect", "agent/prompt-workflow-architect-zh.md");
            overwritePrompt("system_prompt.workflow-architect.en", "agent/prompt-workflow-architect-en.md");
            jdbc.update("INSERT INTO agent_config (config_key, config_type, title, content, description, created_at, updated_at) "
                + "VALUES ('agent.prompt.v2_applied', 'migration_marker', 'v2 提示词迁移标记', "
                + "'v2 toolchain prompts applied at ' || datetime('now'), '存在即不再覆盖提示词', datetime('now'), datetime('now'))");
            log.info("[schema-migrator] v2 prompts applied (one-time overwrite)");
        } catch (Exception e) {
            log.warn("[schema-migrator] prompt migration failed: {}", e.getMessage());
        }
    }

    private void overwritePrompt(String configKey, String resourcePath) {
        try {
            Integer exists = jdbc.queryForObject(
                "SELECT COUNT(*) FROM agent_config WHERE config_key = ?", Integer.class, configKey);
            String content = readResource(resourcePath);
            if (content == null || content.trim().isEmpty()) {
                return;
            }
            if (exists != null && exists > 0) {
                jdbc.update("UPDATE agent_config SET content = ?, updated_at = datetime('now') WHERE config_key = ?",
                    content, configKey);
            } else {
                jdbc.update("INSERT INTO agent_config (config_key, config_type, title, content, description, created_at, updated_at) "
                        + "VALUES (?, 'system_prompt', ?, ?, 'v2 built-in prompt', datetime('now'), datetime('now'))",
                    configKey, configKey, content);
            }
        } catch (Exception e) {
            log.warn("[schema-migrator] overwrite prompt {} failed: {}", configKey, e.getMessage());
        }
    }

    private void addColumnIfMissing(String table, String column, String alterSql) {
        try {
            List<Map<String, Object>> cols = jdbc.queryForList("PRAGMA table_info(" + table + ")");
            for (Map<String, Object> col : cols) {
                if (column.equalsIgnoreCase(String.valueOf(col.get("name")))) {
                    return;
                }
            }
            jdbc.execute(alterSql);
            log.info("[schema-migrator] added column {}.{}", table, column);
        } catch (Exception e) {
            log.warn("[schema-migrator] add {}.{} failed: {}", table, column, e.getMessage());
        }
    }

    private void createTableIfMissing(String table, String createSql) {
        try {
            Integer count = jdbc.queryForObject(
                "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name=?", Integer.class, table);
            if (count == null || count == 0) {
                jdbc.execute(createSql);
                log.info("[schema-migrator] created table {}", table);
            }
        } catch (Exception e) {
            log.debug("[schema-migrator] check {} failed: {}", table, e.getMessage());
        }
    }

    /** 读 classpath 资源（供提示词迁移复用） */
    public static String readResource(String path) {
        try (java.io.InputStream is = new ClassPathResource(path).getInputStream()) {
            java.io.ByteArrayOutputStream buffer = new java.io.ByteArrayOutputStream();
            byte[] data = new byte[4096];
            int n;
            while ((n = is.read(data, 0, data.length)) != -1) {
                buffer.write(data, 0, n);
            }
            return new String(buffer.toByteArray(), StandardCharsets.UTF_8);
        } catch (Exception e) {
            return null;
        }
    }
}
