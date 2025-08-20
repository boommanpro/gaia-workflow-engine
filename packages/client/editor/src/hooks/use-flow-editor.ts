/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { useService } from '@flowgram.ai/core';

import { FlowEditorClient } from '../clients';

export function useFlowEditor(): FlowEditorClient {
  return useService(FlowEditorClient);
}
