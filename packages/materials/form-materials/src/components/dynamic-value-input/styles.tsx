/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import styled from 'styled-components';

export const UIContainer = styled.div`
  display: flex;
  align-items: center;
  border-radius: 4px;
  border: 1px solid var(--semi-color-border);
  line-height: normal;

  overflow: hidden;

  background-color: var(--semi-color-fill-0);
`;

export const UIMain = styled.div`
  flex-grow: 1;
  overflow: hidden;
  min-width: 0;
  border-left: 1px solid var(--semi-color-border);
  border-right: 1px solid var(--semi-color-border);

  & .semi-tree-select,
  & .semi-input-number,
  & .semi-select {
    width: 100%;
    border: none;
    border-radius: 0;
  }

  & .semi-input-wrapper {
    border: none;
    border-radius: 0;
  }

  & .semi-input-textarea-wrapper {
    border: none;
    border-radius: 0;
  }

  & .semi-input-textarea {
    padding: 2px 6px;
    border: none;
    border-radius: 0;
    word-break: break-all;
  }
`;

export const UIType = styled.div`
  & .semi-button {
    border-radius: 0;
  }
`;

export const UITrigger = styled.div`
  & .semi-button {
    border-radius: 0;
  }
`;
