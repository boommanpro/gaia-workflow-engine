/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

export enum NodeOperationType {
  changeFormValues = 'changeFormValues',
}

export interface ChangeFormValuesOperationValue {
  id: string;
  path: string;
  value: unknown;
  oldValue: unknown;
}
