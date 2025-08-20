/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import styled, { css } from 'styled-components';
import { Tag, TreeSelect } from '@douyinfe/semi-ui';

export const UIRootTitle = styled.div`
  margin-right: 4px;
  min-width: 20px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--semi-color-text-2);
`;

export const UIVarName = styled.div<{ $inSelector?: boolean }>`
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;

  ${({ $inSelector }) =>
    $inSelector &&
    css`
      min-width: 50%;
    `}
`;

export const UITag = styled(Tag)`
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: flex-start;

  & .semi-tag-content-center {
    justify-content: flex-start;
  }

  &.semi-tag {
    margin: 0;
    height: 22px;
  }
`;

export const UITreeSelect = styled(TreeSelect)<{ $error?: boolean }>`
  outline: ${({ $error }) => ($error ? '1px solid red' : 'none')};

  & .semi-tree-select-selection {
    padding: 0px;
    height: 22px;
  }

  & .semi-tree-select-selection-content {
    width: 100%;
  }

  & .semi-tree-select-selection-placeholder {
    padding-left: 10px;
  }
`;

export const UIPopoverContent = styled.div`
  padding: 10px;
  display: inline-flex;
  align-items: center;
  justify-content: flex-start;
  white-space: nowrap;
`;
