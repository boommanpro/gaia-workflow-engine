/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import React, { useMemo } from 'react';

import { type Level } from './types';
import { FeedbackStyle, RelativeWrapper } from './style';

interface FeedbackProps {
  // message 内容
  message: string;
  // 不hover状态下是否占用文档流
  layout: 'relative' | 'absolute';
  // 错误等级： error | warning
  level?: Level;
  // 是否展开：该状态仅适配layout 为relative 的状态
  expanded?: boolean;
}

export const Feedback = ({ message, layout, level = 'error', expanded = false }: FeedbackProps) => {
  const feedbackContent = useMemo(
    () => (
      <FeedbackStyle
        expanded={expanded}
        error={level === 'error'}
        warning={level === 'warning'}
        expandable={!expanded}
      >
        {message}
      </FeedbackStyle>
    ),
    [level, message, expanded]
  );

  return layout === 'relative' ? (
    <RelativeWrapper expanded={expanded}>{feedbackContent}</RelativeWrapper>
  ) : (
    feedbackContent
  );
};
