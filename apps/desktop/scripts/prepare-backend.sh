#!/usr/bin/env bash
# 打包后端 Spring Boot fat jar 并复制为 apps/desktop/backend/gaia-workflow-app.jar。
# GAIA_SKIP_MAVEN=1 且 jar 已存在时跳过构建（e2e 快速迭代）。
set -euo pipefail
cd "$(dirname "$0")/.."

JAR=backend/gaia-workflow-app.jar

if [ "${GAIA_SKIP_MAVEN:-0}" = "1" ] && [ -f "$JAR" ]; then
  echo "SKIP: GAIA_SKIP_MAVEN=1 且 $JAR 已存在，跳过 maven 构建"
  exit 0
fi

mvn -f ../api/gaia-workflow/pom.xml -q clean package -DskipTests

BUILT=$(ls ../api/gaia-workflow/gaia-workflow-app/target/gaia-workflow-app-*.jar 2>/dev/null | grep -v sources || true)
if [ -z "$BUILT" ]; then
  echo "ERROR: 未找到构建产物 gaia-workflow-app-*.jar" >&2
  exit 1
fi

mkdir -p backend
cp "$BUILT" "$JAR"
echo "OK: $JAR 已就绪（$(du -h "$JAR" | cut -f1)）"
