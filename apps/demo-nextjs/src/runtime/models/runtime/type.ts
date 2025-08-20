/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

export interface IWorkflowRuntimeModel {
  run: () => Promise<void>;
}
