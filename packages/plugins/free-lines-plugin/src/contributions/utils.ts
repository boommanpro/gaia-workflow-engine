/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { IPoint, Rectangle } from '@flowgram.ai/utils';
import { LinePointLocation } from '@flowgram.ai/free-layout-core';

import { LINE_PADDING } from '../constants/lines';

export function toRelative(p: IPoint, bbox: Rectangle): IPoint {
  return {
    x: p.x - bbox.x + LINE_PADDING,
    y: p.y - bbox.y + LINE_PADDING,
  };
}

export function getShrinkOffset(location: LinePointLocation, shrink: number): IPoint {
  switch (location) {
    case 'left':
      return { x: -shrink, y: 0 };
    case 'right':
      return { x: shrink, y: 0 };
    case 'bottom':
      return { x: 0, y: shrink };
    case 'top':
      return { x: 0, y: -shrink };
  }
}

export function posWithShrink(pos: IPoint, location: LinePointLocation, shrink: number): IPoint {
  const offset = getShrinkOffset(location, shrink);
  return {
    x: pos.x + offset.x,
    y: pos.y + offset.y,
  };
}
