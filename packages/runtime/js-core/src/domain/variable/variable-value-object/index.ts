/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { IVariable, VOData } from '@flowgram.ai/runtime-interface';

import { uuid } from '@infra/utils';

export namespace WorkflowRuntimeVariable {
  export const create = (params: VOData<IVariable>): IVariable => ({
    id: uuid(),
    ...params,
  });
}
