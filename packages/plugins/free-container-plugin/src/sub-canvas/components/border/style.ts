/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import styled from 'styled-components';

export const SubCanvasBorderStyle = styled.div`
  pointer-events: none;

  position: relative;

  display: flex;
  align-items: center;

  width: 100%;
  height: 100%;

  background-color: transparent;
  border: 1px solid var(--coz-stroke-plus, rgba(6, 7, 9, 15%));
  border-color: var(--coz-bg-plus, rgb(249, 249, 249));
  border-style: solid;
  border-width: 8px;
  border-radius: 8px;

  &::before {
    content: '';

    position: absolute;
    z-index: 0;
    inset: -4px;

    background-color: transparent;
    border-color: var(--coz-bg-plus, rgb(249, 249, 249));
    border-style: solid;
    border-width: 4px;
    border-radius: 8px;
  }
`;
