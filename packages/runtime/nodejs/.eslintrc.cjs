/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

const { defineConfig } = require('@flowgram.ai/eslint-config');

module.exports = defineConfig({
  parser: '@typescript-eslint/parser',
  preset: 'node',
  packageRoot: __dirname,
  parserOptions: {
    requireConfigFile: false,
    ecmaVersion: 2017,
    sourceType: "module",
    ecmaFeatures: {
      modules: true,
    }
  },
  rules: {
    'no-console': 'off',
  },
  plugins: ['json', '@typescript-eslint'],
  settings: {
    react: {
      version: '18',
    },
  },
});
