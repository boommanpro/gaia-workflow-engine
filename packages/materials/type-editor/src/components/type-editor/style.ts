/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import styled from 'styled-components';

export const ErrorMsgContainer = styled.div`
  position: absolute;
  bottom: 0;
  left: 0;
  transform: translateY(100%);
  width: calc(100% - 6px);
`;

export const EditCellContainer = styled.div<{
  error?: boolean;
  blink?: boolean;
}>`
  position: absolute;
  width: 100%;
  left: 0;
  top: 0;
  background-color: var(--semi-color-bg-0);
  border: 1px solid var(--semi-color-focus-border);
  height: 38px;
  display: flex;
  align-items: center;
  transition: background-color 200ms;
  box-sizing: border-box;
  ${(props) => (props.error ? 'border: 1px solid var(--semi-color-danger);' : '')}
  ${(props) => (props.blink ? 'background-color: rgba(238, 245, 40) !important;' : '')}
`;

export const DragRowContainer = styled.tr<{
  dragging?: boolean;
}>`
  opacity: ${(props) => (props.dragging ? 0.5 : 1)};
`;

export const EditorTableHeader = styled.th`
  border-right: 1px solid var(--semi-color-border);
  border-bottom-width: 1px !important;
  height: 37px;
  box-sizing: border-box;
  font-size: 12px;
`;

export const EditorTableCell = styled.td`
  border-right: 1px solid var(--semi-color-border) !important;
  position: relative;

  padding: 8px !important;
  height: 36px;
`;

export const EditorTable = styled.table`
  min-width: 600px;
  border-left-width: 1px;
  border-top-width: 1px;
  box-sizing: border-box;
  border-color: var(--semi-color-border);
  width: 100%;
  position: relative;
  border-style: solid;
  border-bottom: none;
  border-right: none;
`;

export const EditorTableTitle = styled.div`
  display: flex;
  align-items: center;
  cursor: pointer;
`;

export const BaseIcon = styled.div`
  width: 12px;
  height: 12px;
  flex-shrink: 0;
`;
