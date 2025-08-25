/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { IPoint, Rectangle } from '@flowgram.ai/utils';

import { LineCenterPoint } from '../typings';

export function getLineCenter(
  from: IPoint,
  to: IPoint,
  bbox: Rectangle,
  linePadding: number
): LineCenterPoint {
  return {
    x: bbox.center.x,
    y: bbox.center.y,
    labelX: bbox.center.x - bbox.x + linePadding,
    labelY: bbox.center.y - bbox.y + linePadding,
  };
}
