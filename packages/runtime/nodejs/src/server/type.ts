/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { ServerInfoOutput } from '@flowgram.ai/runtime-interface';

export interface ServerParams extends Omit<ServerInfoOutput, 'time'> {
  dev: boolean;
  port: number;
  basePath: string;
  docsPath: string;
}
