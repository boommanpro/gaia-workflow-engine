/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { PositionSchema, Rectangle } from '@flowgram.ai/utils';

export const isPointInRect = (point: PositionSchema, rect: Rectangle): boolean =>
  point.x >= rect.left && point.x <= rect.right && point.y >= rect.top && point.y <= rect.bottom;
