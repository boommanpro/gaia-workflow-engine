/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { coordinatesConfigResolver } from './coordinatesConfigResolver'

export const hoverConfigResolver = {
  ...coordinatesConfigResolver,
  mouseOnly: (value = true) => value
}
