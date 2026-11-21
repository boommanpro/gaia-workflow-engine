import { defineConfig } from '@playwright/test';

/**
 * 桌面版 E2E —— 直接驱动 Electron（playwright._electron），三组场景：
 * a) dev-renderer：GAIA_DEV_SERVER_URL + GAIA_SKIP_BACKEND，纯前端形态
 * b) full-stack：生产形态（app:// 协议 + 内嵌 jar 自动拉起），完整链路
 * c) reuse：外部已有 Gaia 后端时复用，不重复 spawn
 *
 * 全部串行（workers:1）：场景 b/c 共用 48080 端口与 java 进程断言，不能并行。
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 240_000, // 场景 b 含 Spring Boot 冷启动（SQLite 初始化）+ 110MB jar
  expect: { timeout: 20_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
});
