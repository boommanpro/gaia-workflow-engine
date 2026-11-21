#!/usr/bin/env bash
# 构建 console 前端（electron 环境变量）并复制到 apps/desktop/frontend-dist。
# 前端零改动：直接复用 apps/console 已有的 build:electron 脚本（.env.electron）。
set -euo pipefail
cd "$(dirname "$0")/.."

pnpm --dir ../console run build:electron

if [ ! -f ../console/dist/index.html ]; then
  echo "ERROR: ../console/dist/index.html 不存在，前端构建异常" >&2
  exit 1
fi

rm -rf frontend-dist
cp -R ../console/dist frontend-dist
echo "OK: frontend-dist/ 已就绪（$(find frontend-dist -type f | wc -l | tr -d ' ') 个文件）"
