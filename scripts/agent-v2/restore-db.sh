#!/usr/bin/env bash
# 用法: restore-db.sh <backup-dir-or-prefix>  （如 scripts/agent-v2/backups/20260101-120000）
# 停服后执行；恢复前会自动把当前库再备份到 backups/pre-restore-*
set -euo pipefail
SRC="${1:?usage: restore-db.sh <backup-dir>}"
DB_DIR="${DB_DIR:-apps/api/gaia-workflow/gaia-workflow-app}"
DB="$DB_DIR/gaia_workflow.db"
[ -f "$SRC/gaia_workflow.db" ] || { echo "no gaia_workflow.db under $SRC" >&2; exit 1; }
TS=$(date +%Y%m%d-%H%M%S)
mkdir -p "scripts/agent-v2/backups/pre-restore-$TS"
for f in "$DB" "$DB-wal" "$DB-shm"; do
  [ -f "$f" ] && cp "$f" "scripts/agent-v2/backups/pre-restore-$TS/$(basename "$f")" || true
done
rm -f "$DB" "$DB-wal" "$DB-shm"
cp "$SRC/gaia_workflow.db" "$DB"
for ext in -wal -shm; do
  [ -f "$SRC/gaia_workflow.db$ext" ] && cp "$SRC/gaia_workflow.db$ext" "$DB$ext" || true
done
echo "restored from $SRC (pre-restore copy: scripts/agent-v2/backups/pre-restore-$TS)"
