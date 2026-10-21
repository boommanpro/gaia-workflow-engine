package cn.boommanpro.gaia.workflow.app.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.Statement;
import java.util.Arrays;
import java.util.List;

/**
 * 启动时幂等补充 SQLite 已有表的列（SQLite 不支持 ADD COLUMN IF NOT EXISTS）
 */
@Slf4j
@Component
public class SchemaMigrationInitializer implements CommandLineRunner {

    // column: table, column name, column type
    private static final List<String[]> MIGRATIONS = Arrays.asList(
        new String[]{"agent_message", "images", "TEXT"},
        new String[]{"agent_message", "parent_message_id", "VARCHAR(64)"},
        new String[]{"agent_message", "thinking", "TEXT"},
        // 交错时间线（run 收尾持久化真实调用链路，刷新后原样还原对话过程）
        new String[]{"agent_message", "timeline", "TEXT"},
        // （agent_knowledge_chunk.language 迁移已删：该表属已下线的 RAG 知识库，
        //  schema.sql 尾部的存量清理段每次启动都会 DROP 它，补列没有意义）
        new String[]{"agent_session", "debug_data", "TEXT"},
        // 工作空间（Codex 风格三区）：旧库补充列
        new String[]{"agent_session", "scope", "VARCHAR(16) DEFAULT 'chat'"},
        new String[]{"agent_session", "folder_id", "BIGINT"},
        new String[]{"agent_session", "pinned", "TINYINT DEFAULT 0"},
        new String[]{"agent_session", "archived", "TINYINT DEFAULT 0"},
        // 执行追踪（对标 OWB trace）：真实请求 JSON 落账，开发者可用日志原样复现模型调用
        new String[]{"agent_llm_call_log", "request_json", "TEXT"},
        // Trajectory 全量输出：流式组装后的完整响应 JSON（content+tool_calls+usage+finish_reason）
        new String[]{"agent_llm_call_log", "response_json", "TEXT"},
        // 条目级上下文窗口（模型管理页可配）：压缩线/容量告警按会话绑定模型的窗口算
        new String[]{"llm_model", "context_window", "INTEGER"},
        // 双引擎架构：local 自研 / ark 方舟托管的会话映射
        new String[]{"agent_session", "engine", "VARCHAR(16) DEFAULT 'local'"},
        new String[]{"agent_session", "remote_session_id", "VARCHAR(128)"},
        new String[]{"agent_session", "remote_agent_id", "VARCHAR(128)"},
        new String[]{"agent_session", "remote_agent_version", "INTEGER"},
        new String[]{"agent_session", "token_usage", "TEXT"},
        // API 调用看板（对话创建 API 模式）：旧库缺列会导致运行日志写入 500
        new String[]{"gaia_workflow_log", "invoke_channel", "VARCHAR(32)"},
        new String[]{"gaia_workflow_log", "api_path", "VARCHAR(128)"},
        new String[]{"gaia_workflow_log", "api_key_prefix", "VARCHAR(32)"},
        new String[]{"gaia_workflow_log", "created_at", "TEXT"}
    );

    private final DataSource dataSource;

    public SchemaMigrationInitializer(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    @Override
    public void run(String... args) {
        try (Connection conn = dataSource.getConnection()) {
            for (String[] migration : MIGRATIONS) {
                String table = migration[0];
                String column = migration[1];
                String type = migration[2];
                if (!columnExists(conn, table, column)) {
                    String sql = "ALTER TABLE " + table + " ADD COLUMN " + column + " " + type;
                    try (Statement stmt = conn.createStatement()) {
                        stmt.execute(sql);
                        log.info("Schema migration: added column {}.{} ({})", table, column, type);
                    } catch (Exception e) {
                        log.warn("Schema migration failed for {}.{}: {}", table, column, e.getMessage());
                    }
                }
            }
            // 索引放在补列之后创建：旧库原先没有 folder_id，schema.sql 里直接建会失败
            try (Statement stmt = conn.createStatement()) {
                stmt.execute("CREATE INDEX IF NOT EXISTS idx_agent_session_folder ON agent_session(folder_id)");
            } catch (Exception e) {
                log.warn("Schema migration failed to create index idx_agent_session_folder: {}", e.getMessage());
            }
        } catch (Exception e) {
            log.warn("Schema migration initializer failed: {}", e.getMessage());
        }
    }

    private boolean columnExists(Connection conn, String table, String column) throws Exception {
        try (PreparedStatement ps = conn.prepareStatement("PRAGMA table_info(" + table + ")")) {
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    if (column.equalsIgnoreCase(rs.getString("name"))) {
                        return true;
                    }
                }
            }
        }
        return false;
    }
}
