/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import React from 'react';

import { IPoint } from '@flowgram.ai/utils';
import { LinePointLocation } from '@flowgram.ai/free-layout-core';

import { type ArrowRendererProps } from '../../types/arrow-renderer';
import { LINE_OFFSET } from '../../constants/lines';

function getArrowPath(pos: IPoint, location: LinePointLocation): string {
  switch (location) {
    case 'left':
      return `M ${pos.x - LINE_OFFSET},${pos.y - LINE_OFFSET} L ${pos.x},${pos.y} L ${
        pos.x - LINE_OFFSET
      },${pos.y + LINE_OFFSET}`;
    case 'right':
      return `M ${pos.x + LINE_OFFSET},${pos.y + LINE_OFFSET} L ${pos.x},${pos.y} L ${
        pos.x + LINE_OFFSET
      },${pos.y - LINE_OFFSET}`;
    case 'bottom':
      return `M ${pos.x - LINE_OFFSET},${pos.y + LINE_OFFSET} L ${pos.x},${pos.y} L ${
        pos.x + LINE_OFFSET
      },${pos.y + LINE_OFFSET}`;
    case 'top':
      return `M ${pos.x - LINE_OFFSET},${pos.y - LINE_OFFSET} L ${pos.x},${pos.y} L ${
        pos.x + LINE_OFFSET
      },${pos.y - LINE_OFFSET}`;
  }
}
export function ArrowRenderer({ id, pos, strokeWidth, location, hide }: ArrowRendererProps) {
  if (hide) {
    return null;
  }
  const arrowPath = getArrowPath(pos, location);

  return (
    <path
      d={arrowPath}
      strokeLinecap="round"
      stroke={`url(#${id})`}
      fill="none"
      strokeWidth={strokeWidth}
    />
  );
}
