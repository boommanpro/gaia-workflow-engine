/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { ConstantKeys, FlowDocumentOptions } from '@flowgram.ai/document';
import { useService } from '@flowgram.ai/core';

export const BASE_DEFAULT_COLOR = '#BBBFC4';
export const BASE_DEFAULT_ACTIVATED_COLOR = '#82A7FC';

export function useBaseColor(): { baseColor: string; baseActivatedColor: string } {
  const options = useService<FlowDocumentOptions>(FlowDocumentOptions);
  return {
    baseColor: options.constants?.[ConstantKeys.BASE_COLOR] || BASE_DEFAULT_COLOR,
    baseActivatedColor:
      options.constants?.[ConstantKeys.BASE_ACTIVATED_COLOR] || BASE_DEFAULT_ACTIVATED_COLOR,
  };
}
