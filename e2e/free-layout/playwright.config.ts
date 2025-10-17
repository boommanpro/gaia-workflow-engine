/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 60 * 1000,
  retries: 1,
  use: {
    baseURL: 'http://localhost:3000',
    headless: true,
  },
  webServer: {
    command: 'rush dev:demo-free-layout',
    port: 3000,
    timeout: 120 * 1000,
    reuseExistingServer: !process.env.GITHUB_ACTIONS,
  },
});
