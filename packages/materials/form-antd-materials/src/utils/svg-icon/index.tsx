/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import React from 'react';

export function SvgIcon(props: {
  size?: 'inherit' | 'extra-small' | 'small' | 'default' | 'large' | 'extra-large';
  svg: React.ReactNode;
}) {
  return <span className="anticon">{props.svg}</span>;
}
