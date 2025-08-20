/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { BuildProcedure } from '@trpc/server';
import { FlowGramAPIDefine } from '@flowgram.ai/runtime-interface';

export interface APIHandler {
  define: FlowGramAPIDefine;
  procedure: BuildProcedure<any, any, any>;
}

export type APIRouter = Record<FlowGramAPIDefine['path'], APIHandler['procedure']>;
