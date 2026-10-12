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
            // LLM 调用账本（generation 级观测）：每次模型调用一行，失败/空响应根因探索的数据底座
            createTableIfMissing("agent_llm_call_log",
                "CREATE TABLE agent_llm_call_log ("
                    + "id INTEGER PRIMARY KEY AUTOINCREMENT, "
                    + "session_key VARCHAR(64) NOT NULL, run_id VARCHAR(64), seq INTEGER, "
                    + "model VARCHAR(128), messages_count INTEGER, tools_count INTEGER, "
                    + "prompt_digest TEXT, output_digest TEXT, "
                    + "prompt_tokens INTEGER, completion_tokens INTEGER, cached_tokens INTEGER, "
                    + "duration_ms BIGINT, status VARCHAR(16), error_message TEXT, created_at TEXT)");
            // 2026-10-11 持久化语义重构：save_workflow 移出 AI 工具集（落版只由用户界面触发），
            // 代码侧已无该工具定义，DB 存量行会让模型继续看到它
            try {
                jdbc.update("DELETE FROM agent_tool_definition WHERE tool_name = 'save_workflow'");
            } catch (Exception ignore) {
                // 表可能尚未创建
            }
            // 2026-10-11 模型配置体系（owb 式多模型）：模型条目表 + 会话级绑定列
            createTableIfMissing("llm_model",
                "CREATE TABLE llm_model ("
                    + "id INTEGER PRIMARY KEY AUTOINCREMENT, "
                    + "display_name VARCHAR(128) NOT NULL, "
                    + "vendor VARCHAR(32), "
                    + "base_url VARCHAR(256), "
                    + "api_key VARCHAR(256), "
                    + "model_id VARCHAR(128), "
                    + "thinking_override VARCHAR(16), "
                    + "max_tokens INTEGER, "
                    + "temperature DOUBLE, "
                    + "extra_body TEXT, "
                    + "enabled INTEGER DEFAULT 1, "
                    + "sort_order INTEGER DEFAULT 0, "
                    + "created_at TEXT, updated_at TEXT)");
            addColumnIfMissing("agent_session", "model_id",
                "ALTER TABLE agent_session ADD COLUMN model_id INTEGER");
            // 双层记忆的条目区（2026-10-11，owb memory 对标）：remember/forget 工具读写，
            // 手写区复用 agent_config（config_key=memory.manual）
            createTableIfMissing("agent_memory",
                "CREATE TABLE agent_memory ("
                    + "id INTEGER PRIMARY KEY AUTOINCREMENT, "
                    + "scope VARCHAR(16) DEFAULT 'global', "
                    + "content TEXT NOT NULL, "
                    + "source VARCHAR(16) DEFAULT 'agent', "
                    + "created_at TEXT, updated_at TEXT)");
            log.info("[schema-migrator] sqlite schema up to date");
        } catch (Exception e) {
            log.warn("[schema-migrator] migration skipped (non-sqlite or failed): {}", e.getMessage());
        }
    }

    /**
     * 提示词同步：classpath 是唯一事实源，DB 里的拷贝在内容未被手工修改时跟随更新。
     *
     * <p>旧方案以 marker（agent.prompt.v2_applied）只覆盖一次，导致后续提示词修订
     * 永远进不了 DB（2026-10-11 实证：v6 修订因 marker 卡住，线上仍跑旧教学，
     * 模型连 fromPort 怎么填都没学过）。现改为哈希比对：每个提示词在
     * agent.prompt.imported_hash.{configKey} 记录上次导入的内容哈希——
     * DB 内容与哈希一致（没人手工改过）就跟随 classpath 更新；
     * 不一致（管理后台改过）则跳过，保护人工修改。</p>
     */
    @PostConstruct
    public void migratePrompts() {
        try {
            syncPrompt("system_prompt.default", "agent/prompt-zh.md");
            syncPrompt("system_prompt.default.en", "agent/prompt-en.md");
            syncPrompt("system_prompt.workflow-architect", "agent/prompt-workflow-architect-zh.md");
            syncPrompt("system_prompt.workflow-architect.en", "agent/prompt-workflow-architect-en.md");
        } catch (Exception e) {
            log.warn("[schema-migrator] prompt migration failed: {}", e.getMessage());
        }
    }

    private void syncPrompt(String configKey, String resourcePath) {
        try {
            String classpathContent = readResource(resourcePath);
            if (classpathContent == null || classpathContent.trim().isEmpty()) {
                return;
            }
            String classpathHash = sha256(classpathContent);
            String dbContent = queryConfigContent(configKey);
            String importedHash = queryConfigContent("agent.prompt.imported_hash." + configKey);
            // 只有存在哈希基线且内容对不上才算手工编辑；首次接管（无基线）一律导入，
            // 否则 marker 时代导入的旧内容永远被当成"手工修改"而无法接管
            boolean dbManuallyEdited = dbContent != null && importedHash != null
                && !sha256(dbContent).equals(importedHash);
            if (dbManuallyEdited) {
                log.info("[schema-migrator] prompt {} manually edited in DB, skip sync", configKey);
                return;
            }
            if (dbContent != null && classpathHash.equals(importedHash)) {
                return; // 已是最新
            }
            upsertConfig(configKey, "system_prompt", configKey, classpathContent,
                "从 " + resourcePath + " 导入（内容变更自动同步）");
            upsertConfig("agent.prompt.imported_hash." + configKey, "migration_marker",
                configKey + " 导入哈希", classpathHash, "提示词同步哈希，勿改");
            log.info("[schema-migrator] prompt {} synced from {}", configKey, resourcePath);
        } catch (Exception e) {
            log.warn("[schema-migrator] sync prompt {} failed: {}", configKey, e.getMessage());
        }
    }

    private String queryConfigContent(String configKey) {
        try {
            return jdbc.queryForObject(
                "SELECT content FROM agent_config WHERE config_key = ?", String.class, configKey);
        } catch (Exception e) {
            return null;
        }
    }

    private void upsertConfig(String configKey, String configType, String title, String content, String description) {
        Integer exists = jdbc.queryForObject(
            "SELECT COUNT(*) FROM agent_config WHERE config_key = ?", Integer.class, configKey);
        if (exists != null && exists > 0) {
            jdbc.update("UPDATE agent_config SET content = ?, description = ?, updated_at = datetime('now') "
                + "WHERE config_key = ?", content, description, configKey);
        } else {
            jdbc.update("INSERT INTO agent_config (config_key, config_type, title, content, description, created_at, updated_at) "
                    + "VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))",
                configKey, configType, title, content, description);
        }
    }

    private static String sha256(String content) {
        try {
            java.security.MessageDigest digest = java.security.MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(content.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder();
            for (byte b : hash) {
                sb.append(String.format("%02x", b));
            }
            return sb.toString();
        } catch (Exception e) {
            return String.valueOf(content.hashCode());
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
