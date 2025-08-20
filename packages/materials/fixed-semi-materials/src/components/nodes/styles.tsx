/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import styled from 'styled-components';

import { primary, primaryOpacity09 } from '../constants';

export const NodeWrap = styled.div`
  width: 100%;
  height: 32px;
  border-radius: 5px;
  display: flex;
  align-items: center;
  cursor: pointer;
  font-size: 19px;
  padding: 0 15px;
  &:hover: {
    background-color: ${primaryOpacity09};
    color: ${primary};
  },
`;

export const NodeLabel = styled.div`
  font-size: 12px;
  margin-left: 10px;
`;

export const NodesWrap = styled.div`
  max-height: 500px;
  overflow: auto;
  &::-webkit-scrollbar {
    display: none;
  }
`;
