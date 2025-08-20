/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { Subscription } from 'rxjs';
import { Disposable } from '@flowgram.ai/utils';

export function subsToDisposable(subscription: Subscription): Disposable {
  return Disposable.create(() => subscription.unsubscribe());
}
