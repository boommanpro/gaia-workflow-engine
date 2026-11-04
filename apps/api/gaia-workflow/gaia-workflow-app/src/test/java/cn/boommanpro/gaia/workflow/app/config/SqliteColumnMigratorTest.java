package cn.boommanpro.gaia.workflow.app.config;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.sqlite.SQLiteDataSource;

import java.nio.file.Path;
import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/**
 * SQLite 增量列迁移：存量库缺列时补齐，重复执行幂等（schema.sql 的 CREATE TABLE IF NOT EXISTS
 * 不会给已有表加列，SQLite ADD COLUMN 又不支持 IF NOT EXISTS——这条链路只能靠探测后补）。
 */
class SqliteColumnMigratorTest {

    @TempDir
    Path tempDir;

    private SQLiteDataSource dataSourceOf(Path dbFile) {
        SQLiteDataSource ds = new SQLiteDataSource();
        ds.setUrl("jdbc:sqlite:" + dbFile.resolve("test.db"));
        return ds;
    }

    @Test
    @DisplayName("缺列的存量库启动后补上 source_session，重复启动幂等")
    void addsMissingColumnIdempotently() throws Exception {
        SQLiteDataSource ds = dataSourceOf(tempDir);
        try (Connection conn = ds.getConnection(); Statement stmt = conn.createStatement()) {
            stmt.execute("CREATE TABLE gaia_workflow_version ("
                + "id INTEGER PRIMARY KEY AUTOINCREMENT, workflow_code VARCHAR(64) NOT NULL)");
        }

        SqliteColumnMigrator migrator = new SqliteColumnMigrator(ds);
        migrator.run(null);
        migrator.run(null); // 第二次启动：列已存在，不得报错

        List<String> columns = new ArrayList<>();
        try (Connection conn = ds.getConnection(); Statement stmt = conn.createStatement();
             ResultSet rs = stmt.executeQuery("PRAGMA table_info(gaia_workflow_version)")) {
            while (rs.next()) {
                columns.add(rs.getString("name"));
            }
        }
        assertTrue(columns.contains("source_session"), "迁移后必须有 source_session 列：" + columns);
    }

    @Test
    @DisplayName("补列后可正常写入该列（entity 新字段在存量库上可用）")
    void addedColumnIsWritable() throws Exception {
        SQLiteDataSource ds = dataSourceOf(tempDir);
        try (Connection conn = ds.getConnection(); Statement stmt = conn.createStatement()) {
            stmt.execute("CREATE TABLE gaia_workflow_version ("
                + "id INTEGER PRIMARY KEY AUTOINCREMENT, workflow_code VARCHAR(64) NOT NULL)");
        }
        new SqliteColumnMigrator(ds).run(null);

        try (Connection conn = ds.getConnection(); Statement stmt = conn.createStatement()) {
            stmt.execute("INSERT INTO gaia_workflow_version (workflow_code, source_session) "
                + "VALUES ('wf_test', 'sess_abc')");
            ResultSet rs = stmt.executeQuery(
                "SELECT source_session FROM gaia_workflow_version WHERE workflow_code = 'wf_test'");
            assertTrue(rs.next());
            assertEquals("sess_abc", rs.getString(1));
        }
    }
}
