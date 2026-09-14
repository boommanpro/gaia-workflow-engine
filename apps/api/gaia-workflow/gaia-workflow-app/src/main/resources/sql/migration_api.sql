-- ===========================================================================
-- 迁移脚本：对话创建 API 模式（发布为 API + 调用看板）
-- 适用于已存在 gaia_workflow.db 的开发/演示库（schema.sql 为全新库建表用）。
-- SQLite 不支持 IF NOT EXISTS 修饰 ALTER，下面用容错方式执行：
--   - 建表用 CREATE TABLE IF NOT EXISTS
--   - 加列前先判断列是否存在，避免重复执行报错
-- ===========================================================================

CREATE TABLE IF NOT EXISTS gaia_workflow_api (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    workflow_code VARCHAR(64) NOT NULL UNIQUE,
    api_name VARCHAR(128),
    api_desc TEXT,
    version_number VARCHAR(32),
    api_path VARCHAR(128),
    api_key VARCHAR(128),
    status TINYINT DEFAULT 0,
    request_schema TEXT,
    response_schema TEXT,
    error_codes TEXT,
    created_at TEXT,
    updated_at TEXT,
    is_deleted TINYINT DEFAULT 0
);

-- 给 gaia_workflow_log 增加调用渠道/路径/Key 前缀三列
-- 注意：SQLite 的 ALTER TABLE 无 IF NOT EXISTS，若列已存在会报错，
-- 请按 sqlite3 的 pragma_table_info 判断后再执行（见 migrate_api.sh 的写法）。
ALTER TABLE gaia_workflow_log ADD COLUMN invoke_channel VARCHAR(32);
ALTER TABLE gaia_workflow_log ADD COLUMN api_path VARCHAR(128);
ALTER TABLE gaia_workflow_log ADD COLUMN api_key_prefix VARCHAR(32);

-- 历史数据回填：此前的执行全部来自 /api/execute/{code}，属对外 API 调用，
-- 回填渠道后调用看板即可展示历史调用量。
UPDATE gaia_workflow_log SET invoke_channel = 'api' WHERE invoke_channel IS NULL;

-- created_at 历史为空（此前工程缺少 MyBatis-Plus MetaObjectHandler，
-- 新增后已自动填充）。用 start_time 回填，保证看板按天聚合趋势不丢历史。
UPDATE gaia_workflow_log SET created_at = start_time WHERE created_at IS NULL AND start_time IS NOT NULL;
