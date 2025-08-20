/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { Playground, createPlaygroundContainer } from '../src'

export function createPlayground(): Playground {
  return createPlaygroundContainer().get(Playground)
}
