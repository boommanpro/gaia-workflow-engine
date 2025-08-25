/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { IPoint, Rectangle } from '@flowgram.ai/utils';

import { LINE_PADDING } from '../constants/lines';

export function toRelative(p: IPoint, bbox: Rectangle): IPoint {
  return {
    x: p.x - bbox.x + LINE_PADDING,
    y: p.y - bbox.y + LINE_PADDING,
  };
}
