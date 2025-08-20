/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

// This is a workaround for https://github.com/eslint/eslint/issues/3458
require('@rushstack/eslint-config/patch/modern-module-resolution');

module.exports = {
  extends: ['./.eslintrc.base.js'],
  globals: {
    NodeJS: true,
  },
  env: {
    browser: false,
    node: true,
    es2020: true,
    jest: true,
  },
  rules: {},
};
