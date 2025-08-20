/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import React, { CSSProperties, ReactNode, type FC } from 'react';

import { SubCanvasBorderStyle } from './style';

interface ISubCanvasBorder {
  style?: CSSProperties;
  children?: ReactNode | ReactNode[];
}

export const SubCanvasBorder: FC<ISubCanvasBorder> = ({ style, children }) => (
  <SubCanvasBorderStyle
    className="sub-canvas-border"
    style={{
      ...style,
    }}
  >
    {children}
  </SubCanvasBorderStyle>
);
