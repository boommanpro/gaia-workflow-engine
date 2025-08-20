/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { IReport, VOData } from '@flowgram.ai/runtime-interface';

import { uuid } from '@infra/utils';

export namespace WorkflowRuntimeReport {
  export const create = (params: VOData<IReport>): IReport => ({
    id: uuid(),
    ...params,
  });
}
