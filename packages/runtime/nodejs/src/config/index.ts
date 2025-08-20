/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import type { ServerParams } from '@server/type';

export const ServerConfig: ServerParams = {
  name: 'flowgram-runtime',
  title: 'FlowGram Runtime',
  description: 'FlowGram Runtime Demo',
  runtime: 'nodejs',
  version: '0.0.1',
  dev: false,
  port: 4000,
  basePath: '/api',
  docsPath: '/docs',
};
