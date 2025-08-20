/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

const path = require('path');

const { main } = require('./package.json');

const { defineConfig } = require(path.resolve(__dirname, main));

module.exports = defineConfig({
  packageRoot: __dirname,
  preset: 'node',
  settings: {
    react: {
      version: 'detect', // 自动检测 React 版本
    },
  },
});
