/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import React, { type CSSProperties } from 'react';
/**
 * 搜索结果高亮
 */
export const useHighlightKeyword = (
  label: string,
  keyword?: string,
  hightLightStyle: CSSProperties = {},
  id?: string
  // color = 'rgba(var(--semi-orange-5), 1)',
): (string | React.JSX.Element)[] => {
  if (label && keyword) {
    return label.split(new RegExp(`(${keyword})`, 'gi')).map((c, i) =>
      c.toLocaleLowerCase() === keyword.toLocaleLowerCase() ? (
        <span
          key={c + i + id}
          style={{
            color: 'rgba(var(--semi-orange-5), 1)',
            ...hightLightStyle,
          }}
        >
          {c}
        </span>
      ) : (
        <span key={c + i + id}>{c}</span>
      )
    );
  }
  return [label];
};
