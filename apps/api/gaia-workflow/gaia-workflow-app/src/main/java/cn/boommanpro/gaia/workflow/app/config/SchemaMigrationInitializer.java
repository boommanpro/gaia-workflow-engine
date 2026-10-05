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
        new String[]{"agent_knowledge_chunk", "language", "VARCHAR(10) DEFAULT 'zh'"},
        new String[]{"agent_session", "debug_data", "TEXT"},
        // 工作空间（Codex 风格三区）：旧库补充列
        new String[]{"agent_session", "scope", "VARCHAR(16) DEFAULT 'chat'"},
        new String[]{"agent_session", "folder_id", "BIGINT"},
        new String[]{"agent_session", "pinned", "TINYINT DEFAULT 0"},
        new String[]{"agent_session", "archived", "TINYINT DEFAULT 0"}
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
