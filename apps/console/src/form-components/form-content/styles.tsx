/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import styled from 'styled-components';

export const FormWrapper = styled.div`
  box-sizing: border-box;
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 6px;
  background-color: var(--ge-node-body, rgb(251, 251, 251));
  border-radius: 0 0 8px 8px;
  padding: 0 12px 12px;
`;

export const FormTitleDescription = styled.div`
  color: var(--semi-color-text-2);
  font-size: 12px;
  line-height: 20px;
  padding: 0px 4px;
  word-break: break-all;
  white-space: break-spaces;
`;

/** 画布卡片上的描述：单行省略（完整内容走 title 悬停），双击就地编辑 */
export const CanvasDescription = styled(FormTitleDescription)`
  white-space: nowrap;
  word-break: normal;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 18px;
  cursor: text;
`;

/** 侧栏空描述引导行：仅侧栏显示（画布为空时零占位，不渲染任何元素） */
export const EmptyHint = styled(FormTitleDescription)`
  opacity: 0.66;
  cursor: text;
`;
