/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import styled from 'styled-components';

export const FeedbackStyle = styled.div<{
  // 是否展开
  expanded?: boolean;
  // 是否错误
  error?: boolean;
  // 是否警告
  warning?: boolean;
  // 是否可展开
  expandable?: boolean;
}>`
  position: absolute;

  ${(props) =>
    props.expanded
      ? `
  position: relative;
  `
      : ''}

  color: #fff;
  max-width: 100%;
  width: fit-content;
  padding: 0 4px;
  font-size: 10px;
  line-height: 18px;
  word-break: break-all;

  &.expandable {
  }

  ${(props) =>
    props.expandable
      ? `
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;

  &:hover {
    white-space: normal;
    overflow: visible;
  }
  `
      : ''}

  ${(props) =>
    props.error
      ? `
    background-color: var(--semi-color-danger);
    `
      : ''}


  ${(props) =>
    props.warning
      ? `
    background-color:var(--semi-color-warning);
    `
      : ''}


  z-index: 1;
`;

export const RelativeWrapper = styled.div<{
  // 是否展开
  expanded?: boolean;
}>`
  position: relative;
  height: 18px;

  ${(props) =>
    props.expanded
      ? `
      height: fit-content;
    `
      : ''}
`;
