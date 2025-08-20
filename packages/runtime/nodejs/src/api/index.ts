/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { FlowGramAPINames } from '@flowgram.ai/runtime-interface';

import { APIRouter } from './type';
import { router } from './trpc';
import { createAPI } from './create-api';

const APIS = FlowGramAPINames.map((apiName) => createAPI(apiName));

export const routers = APIS.reduce((acc, api) => {
  acc[api.define.path] = api.procedure;
  return acc;
}, {} as APIRouter);

export const appRouter = router(routers);

export type AppRouter = typeof appRouter;
