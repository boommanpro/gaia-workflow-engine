/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { defineConfig } from 'tsup';

export default defineConfig({
  // https://tsup.egoist.dev/#inject-cjs-and-esm-shims
  shims: true,
});
