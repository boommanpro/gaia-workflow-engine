/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { isEmpty } from 'lodash-es';
import {
  DataEvent,
  Effect,
  EffectOptions,
  getNodeScope,
  getNodePrivateScope,
} from '@flowgram.ai/editor';

export const validateWhenVariableSync = ({
  scope,
}: {
  scope?: 'private' | 'public';
} = {}): EffectOptions[] => [
  {
    event: DataEvent.onValueInit,
    effect: (({ context, form }) => {
      const nodeScope =
        scope === 'private' ? getNodePrivateScope(context.node) : getNodeScope(context.node);

      const disposable = nodeScope.available.onListOrAnyVarChange(() => {
        if (!isEmpty(form.state.errors)) {
          form.validate();
        }
      });

      return () => disposable.dispose();
    }) as Effect,
  },
];
