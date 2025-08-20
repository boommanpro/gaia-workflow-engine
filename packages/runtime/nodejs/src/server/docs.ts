/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { generateOpenApiDocument } from 'trpc-openapi';

import { ServerConfig } from '@config/index';
import { appRouter } from '@api/index';

// Generate OpenAPI schema document
export const serverDocument = generateOpenApiDocument(appRouter, {
  title: ServerConfig.title,
  description: ServerConfig.description,
  version: ServerConfig.version,
  baseUrl: `http://localhost:${ServerConfig.port}${ServerConfig.basePath}`,
  docsUrl: 'https://flowgram.ai',
  tags: ['Task'],
});
