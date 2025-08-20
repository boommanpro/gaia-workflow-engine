/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

const { defineConfig } = require('@flowgram.ai/eslint-config');

module.exports = defineConfig({
  preset: 'web',
  packageRoot: __dirname,
  rules: {
    'no-console': 'off',
    'react/prop-types': 'off',
    'react/no-deprecated': 'off',
  },
  settings: {
    react: {
      version: '16.8.6', // React version. "detect" automatically picks the version you have installed.
    },
  },
});
