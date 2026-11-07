/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import styled from 'styled-components';

export const Header = styled.div`
  box-sizing: border-box;
  display: flex;
  justify-content: flex-start;
  align-items: center;
  width: 100%;
  column-gap: 8px;
  border-radius: 8px 8px 0 0;
  cursor: move;

  background: var(--ge-node-head, linear-gradient(#f2f2ff 0%, rgb(251, 251, 251) 100%));
  overflow: hidden;

  padding: 8px;
`;

export const Title = styled.div`
  font-size: 20px;
  flex: 1;
  width: 0;
`;

export const Subtitle = styled.div`
  font-size: 12px;
  line-height: 18px;
  color: var(--ge-text-2, #7b8090);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  padding: 0 10px 6px;
  background: var(--ge-node-head, linear-gradient(#f2f2ff 0%, rgb(251, 251, 251) 100%));
  width: 100%;
  box-sizing: border-box;
`;

export const Operators = styled.div`
  display: flex;
  align-items: center;
  column-gap: 4px;
`;
export const FormTitleDescription = styled.div`
  color: var(--semi-color-text-2);
  font-size: 12px;
  line-height: 20px;
  padding: 10px;
  word-break: break-all;
  white-space: break-spaces;
  background: var(--ge-node-desc, #f5f5fc);
  width: 100%; /* 确保宽度为 100% */
  box-sizing: border-box; /* 确保 padding 不影响宽度 */
`;
