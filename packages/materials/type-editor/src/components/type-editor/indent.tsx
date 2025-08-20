/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import React from 'react';
import { type CSSProperties, type FC } from 'react';

export const Indent: FC<{
  count: number;
  style?: CSSProperties;
}> = ({ count, style = {} }) => <div style={{ height: '100%', width: count * 12, ...style }} />;

export const WidthIndent: FC<{
  width: number;
  style?: CSSProperties;
}> = ({ width, style = {} }) => <div style={{ height: '100%', flexShrink: 0, width, ...style }} />;
