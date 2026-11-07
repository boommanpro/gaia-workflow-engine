/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

// @flowgram.ai/eslint-config 1.0.x 只提供 flat config 入口（defineFlatConfig），
// 旧的 .eslintrc.js + defineConfig 在该版本下无法加载。
const { defineFlatConfig } = require('@flowgram.ai/eslint-config');

module.exports = defineFlatConfig({
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
