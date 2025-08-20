/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import styled from 'styled-components';

export const UILineContainer = styled.div`
  display: flex;
  align-items: center;
`;

export const UILine = (width: number, height: number) =>
  styled.div`
    width: ${width}px;
    height: ${height}px;
    background: #3370ff;
  `;
