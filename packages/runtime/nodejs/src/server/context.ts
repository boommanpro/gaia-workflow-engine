/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import type { CreateFastifyContextOptions } from '@trpc/server/adapters/fastify';

export function createContext(ctx: CreateFastifyContextOptions) {
  const { req, res } = ctx;
  return { req, res };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
