#!/usr/bin/env bash
# ===========================================================================
# 幂等应用 migration_api.sql 到指定 SQLite 库。
# 用法：./migrate_api.sh [/path/to/gaia_workflow.db]
# 说明：SQLite 的 ALTER TABLE 不支持 IF NOT EXISTS，这里先查 pragma_table_info
#       判断列是否存在，再决定是否加列，因此可重复执行。
# ===========================================================================
set -euo pipefail

DB="${1:-gaia_workflow.db}"

if [ ! -f "$DB" ]; then
  echo "数据库不存在：$DB" >&2
  exit 1
fi

echo "==> 目标库：$DB"

# 1. 发布记录表
sqlite3 "$DB" <<'SQL'
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
SQL
echo "==> gaia_workflow_api 就绪"

# 2. 调用日志加列（幂等）
add_column() {
  local col="$1" ddl="$2"
  local exists
  exists=$(sqlite3 "$DB" "SELECT COUNT(*) FROM pragma_table_info('gaia_workflow_log') WHERE name='$col';")
  if [ "$exists" = "0" ]; then
    sqlite3 "$DB" "ALTER TABLE gaia_workflow_log ADD COLUMN $ddl;"
    echo "==> 已新增列 $col"
  else
    echo "==> 列 $col 已存在，跳过"
  fi
}

add_column invoke_channel  "invoke_channel VARCHAR(32)"
add_column api_path        "api_path VARCHAR(128)"
add_column api_key_prefix  "api_key_prefix VARCHAR(32)"

# 3. 历史调用回填（此前的执行均来自 /api/execute/{code}）
sqlite3 "$DB" "UPDATE gaia_workflow_log SET invoke_channel='api' WHERE invoke_channel IS NULL;"
echo "==> 历史调用已回填 invoke_channel=api"

# 4. created_at 回填（工程原先缺少 MetaObjectHandler，导致该列为空）
sqlite3 "$DB" "UPDATE gaia_workflow_log SET created_at=start_time WHERE created_at IS NULL AND start_time IS NOT NULL;"
echo "==> created_at 已用 start_time 回填"

echo "==> 迁移完成"
