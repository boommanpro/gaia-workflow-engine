package cn.boommanpro.gaia.workflow.app.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.Statement;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * SQLite 增量列迁移 —— schema.sql 只建新表（CREATE TABLE IF NOT EXISTS），存量库
 * 加列只能靠 ALTER TABLE，而 SQLite 的 ADD COLUMN 不支持 IF NOT EXISTS，直接写进
 * schema.sql 会在第二次启动时因重复列报错。这里用 PRAGMA table_info 探测后补列，
 * 幂等可重复执行。新列同时登记进 schema.sql（新库）与这里的清单（存量库）。
 */
@Slf4j
@Component
@Order(0)
public class SqliteColumnMigrator implements ApplicationRunner {

    /** 存量库需要补齐的列：表 → (列名 → 列类型)。与 schema.sql 保持同型。 */
    private static final Map<String, Map<String, String>> REQUIRED_COLUMNS = new LinkedHashMap<>();

    static {
        REQUIRED_COLUMNS.put("gaia_workflow_version", new LinkedHashMap<>() {{
            put("source_session", "VARCHAR(64)");
        }});
    }

    private final DataSource dataSource;

    public SqliteColumnMigrator(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    @Override
    public void run(ApplicationArguments args) throws Exception {
        try (Connection conn = dataSource.getConnection()) {
            for (Map.Entry<String, Map<String, String>> table : REQUIRED_COLUMNS.entrySet()) {
                for (Map.Entry<String, String> column : table.getValue().entrySet()) {
                    addColumnIfMissing(conn, table.getKey(), column.getKey(), column.getValue());
                }
            }
        }
    }

    private void addColumnIfMissing(Connection conn, String table, String column, String type) {
        try {
            if (columnExists(conn, table, column)) {
                return;
            }
            try (Statement stmt = conn.createStatement()) {
                stmt.execute("ALTER TABLE " + table + " ADD COLUMN " + column + " " + type);
            }
            log.info("[schema-migrate] {}.{} added", table, column);
        } catch (Exception e) {
            // 列缺失只影响新字段的读写；启动不被单个补列失败阻断，问题在日志里可见
            log.warn("[schema-migrate] add {}.{} failed: {}", table, column, e.getMessage());
        }
    }

    private boolean columnExists(Connection conn, String table, String column) throws Exception {
        try (Statement stmt = conn.createStatement();
             ResultSet rs = stmt.executeQuery("PRAGMA table_info(" + table + ")")) {
            while (rs.next()) {
                if (column.equalsIgnoreCase(rs.getString("name"))) {
                    return true;
                }
            }
        }
        return false;
    }
}
