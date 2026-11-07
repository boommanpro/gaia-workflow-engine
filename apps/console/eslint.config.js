/**
 * Copyright (c) 2025 Bytedance Ltd. and its affiliates
 * SPDX-License-Identifier: MIT
 */

// @flowgram.ai/eslint-config 1.0.x 只提供 flat config 入口（defineFlatConfig），
// 旧的 .eslintrc.js + defineConfig 在该版本下无法加载。
// 2026-11-08：随 package.json 增加 "type": "module" 改为 ESM 写法（.js）——
// eslint 8.54 不识别 eslint.config.cjs（8.55 起才支持），CI/本地都会找不到配置。
import { defineFlatConfig } from '@flowgram.ai/eslint-config';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineFlatConfig({
  preset: 'web',
  packageRoot: __dirname,
  ignore: ['dist/**', 'node_modules/**', 'test-results/**', 'playwright-report/**'],
  rules: {
    'no-console': 'off',
    'react/prop-types': 'off',
  },
  settings: {
    react: {
      version: 'detect',
    },
  },
});
