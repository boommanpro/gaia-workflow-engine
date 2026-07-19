/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import React from 'react';

import { Typography } from '@douyinfe/semi-ui';

const { Text } = Typography;

export interface ValueDisplayProps {
  value?: string;
  hasError?: boolean;
  style?: React.CSSProperties;
}

/**
 * Display a value in read-only mode
 */
export const ValueDisplay: React.FC<ValueDisplayProps> = ({ value, hasError, style }) => (
  <Text
    type="secondary"
    style={{
      ...style,
      padding: '4px 8px',
      display: 'block',
      outline: hasError ? '1px solid red' : undefined,
      wordBreak: 'break-all',
    }}
  >
    {value || '-'}
  </Text>
);
