import { defineConfig } from '@playwright/test';

/**
 * 对话 UI E2E —— 全部跑在回放模式（?replay=<fixture>）上：
 * 零后端、零 LLM 依赖，事件序列由 public/replay-fixtures/*.json 驱动，
 * 场景即「每个历史 bug 的全链路复现」。dev server 用独立端口（3111），
 * 不依赖 48080 后端（回放模式拦截全部 /api 与 SSE）。
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  reporter: [['list']],
  use: {
    baseURL: 'http://127.0.0.1:3111',
    viewport: { width: 1280, height: 900 },
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'cross-env PORT=3111 node_modules/.bin/rsbuild dev',
    url: 'http://127.0.0.1:3111',
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
