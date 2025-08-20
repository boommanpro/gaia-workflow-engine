/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

require('ts-node').register({ transpileOnly: true, cwd: __dirname });

const { defineConfig } = require('./defineConfig');

module.exports = { defineConfig };
