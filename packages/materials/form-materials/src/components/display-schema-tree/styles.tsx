/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import styled, { css } from 'styled-components';

export const TreeRow = styled.div`
  display: flex;
  align-items: center;

  .tree-icon {
    margin-right: 8px;
    width: 14px;
    height: 14px;
  }

  height: 27px;
  white-space: nowrap;
`;

export const HorizontalLine = styled.div`
  position: relative;

  &::before,
  &::after {
    content: '';
    position: absolute;
    background-color: var(--semi-color-text-3);
  }

  &::after {
    top: 0px;
    right: 6px;
    width: 15px;
    height: 1px;
  }
`;

export const TreeTitle = styled.div`
  // overflow: hidden;
  // text-overflow: ellipsis;
`;

export const TreeLevel = styled.div`
  padding-left: 30px;
  position: relative;

  /* &::before {
    content: '';
    position: absolute;
    background-color: var(--semi-color-text-3);
    top: 0px;
    bottom: 0px;
    left: -22px;
    width: 1px;
  } */
`;

export const TreeItem = styled.div<{ depth: number }>`
  position: relative;

  &::before {
    content: '';
    position: absolute;
    background-color: var(--semi-color-text-3);
  }

  &:not(:last-child)::before {
    width: 1px;
    top: 0;
    bottom: 0;
    left: -22px;
  }

  &:last-child::before {
    width: 1px;
    top: 0;
    height: 14px;
    left: -22px;
  }

  ${(props) =>
    props.depth === 0 &&
    css`
      &::before {
        width: 0px !important;
      }
    `}
`;
