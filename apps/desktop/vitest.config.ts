import { defineConfig } from 'vitest/config';

// 桌面版单测：主进程纯逻辑模块（node 环境，不拉起 electron）
export default defineConfig({
  test: {
    include: ['test/**/*.test.js'],
    environment: 'node',
  },
});
