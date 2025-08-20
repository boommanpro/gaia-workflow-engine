/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import styled, { createGlobalStyle } from 'styled-components';
import { Input, Typography } from '@douyinfe/semi-ui';

export const KeyViewContainer = styled.div<{
  disabled?: boolean;
}>`
  width: 100%;
  display: flex;
  align-items: center;
  height: 20px;
  ${(props) => (props.disabled ? 'cursor: not-allowed !important;' : '')}
  svg {
    width: 12px;
    height: 12px;
    flex-shrink: 0;
  }
`;

export const KeyViewContent = styled.div`
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 4px;
  width: 0;
  flex: 1;
`;

export const KeyEditorContainer = styled.div`
  height: 100%;
  width: 100%;
  display: flex;

  svg {
    flex-shrink: 0;
  }

  .semi-input-wrapper-focus {
    border-color: transparent !important;
  }

  .semi-input-wrapper:hover {
    background-color: var(--semi-color-fill-0);
  }

  .semi-cascader:hover {
    background-color: var(--semi-color-fill-0);
  }

  .semi-cascader:focus {
    border-color: transparent !important;
  }

  .semi-cascader-focus {
    border-color: transparent !important;
  }
`;

export const KeyEditorInput = styled(Input)`
  flex: 1;
  height: 100%;
  display: flex;
  align-items: center;
  input {
    font-size: 12px !important;
  }
`;

export const KeyViewText = styled(Typography.Text)<{
  disabled?: boolean;
}>`
  flex: 1;
  cursor: text;
  font-size: 12px;
  height: 100%;
  ${(props) =>
    props.disabled
      ? `
      cursor: not-allowed !important;
    `
      : ''}
`;

export const BaseIcon = styled.div<{
  draggable?: boolean;
  triangle?: boolean;
  disabled?: boolean;
  primary?: boolean;
  isRotate?: boolean;
}>`
  color: var(--semi-color-text-2);
  cursor: pointer;

  ${(props) =>
    props.draggable
      ? `
    cursor: grab;
    margin-right: 4px;
  `
      : ''}

  ${(props) =>
    props.triangle
      ? `
    transform: rotate(270deg);

  `
      : ''}

  ${(props) =>
    props.isRotate
      ? `
    transform: rotate(360deg);

  `
      : ''}

  ${(props) =>
    props.disabled
      ? `
      opacity: 0.5;
      cursor: not-allowed;
    `
      : ''}

  ${(props) =>
    props.primary
      ? `
        color: var(--semi-color-primary) !important;
      `
      : ''}

  &:hover {
    color: var(--semi-color-primary);
  }
`;

export const CenterContainer = styled.div`
  width: 100%;
  height: 20px;
  display: flex;
  align-items: center;
  gap: 12px;
  justify-content: center;
`;

export const TypeDisableViewContainer = styled(KeyViewContainer)`
  color: var(--semi-color-disabled-text) !important;
  cursor: not-allowed;
  font-size: 12px;

  :global {
    .semi-typography {
      color: var(--semi-color-disabled-text) !important;
    }
  }
`;

export const TypeTextContainer = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  box-sizing: border-box;
  align-items: center;
  padding: 1px 5px;
`;

export const GlobalSelectStyle = createGlobalStyle`
  .semi-select {
      border: none !important
    }

`;
