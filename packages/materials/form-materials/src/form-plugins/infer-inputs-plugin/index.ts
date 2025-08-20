/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { get, set } from 'lodash';
import { defineFormPluginCreator, getNodePrivateScope, getNodeScope } from '@flowgram.ai/editor';

import { FlowValueUtils } from '@/shared';

interface InputConfig {
  sourceKey: string;
  targetKey: string;
  scope?: 'private' | 'public';
}

export const createInferInputsPlugin = defineFormPluginCreator<InputConfig>({
  onSetupFormMeta({ addFormatOnSubmit }, { sourceKey, targetKey, scope }) {
    if (!sourceKey || !targetKey) {
      return;
    }

    addFormatOnSubmit((formData, ctx) => {
      set(
        formData,
        targetKey,
        FlowValueUtils.inferJsonSchema(
          get(formData, sourceKey),
          scope === 'private' ? getNodePrivateScope(ctx.node) : getNodeScope(ctx.node)
        )
      );

      return formData;
    });
  },
});
