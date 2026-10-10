#!/usr/bin/env bash
# 备份 SQLite 主库（含 -wal/-shm），带时间戳；恢复用 restore-db.sh
set -euo pipefail
DB_DIR="${DB_DIR:-apps/api/gaia-workflow/gaia-workflow-app}"
DB="$DB_DIR/gaia_workflow.db"
BACKUP_ROOT="${BACKUP_ROOT:-scripts/agent-v2/backups}"
TS=$(date +%Y%m%d-%H%M%S)
OUT="$BACKUP_ROOT/$TS"
mkdir -p "$OUT"
if [ ! -f "$DB" ]; then echo "DB not found: $DB" >&2; exit 1; fi
# 用 sqlite3 .backup 保证一致性；没有 sqlite3 时退化为文件拷贝
if command -v sqlite3 >/dev/null 2>&1; then
  sqlite3 "$DB" ".backup '$OUT/gaia_workflow.db'"
else
  cp "$DB" "$OUT/gaia_workflow.db"
fi
for ext in -wal -shm; do
  [ -f "$DB$ext" ] && cp "$DB$ext" "$OUT/gaia_workflow.db$ext" || true
done
echo "backup ok: $OUT"
