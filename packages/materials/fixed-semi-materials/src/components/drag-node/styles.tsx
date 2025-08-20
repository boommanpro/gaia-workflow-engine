/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import styled from 'styled-components';

import { primary, primaryOpacity09 } from '../constants';

export const UIDragNodeContainer = styled.div`
  position: relative;
  height: 32px;
  border-radius: 5px;
  display: flex;
  align-items: center;
  cursor: pointer;
  font-size: 19px;
  border: 1px solid ${primary};
  padding: 0 15px;
  &:hover: {
    background-color: ${primaryOpacity09};
    color: ${primary};
  }
`;

export const UIDragCounts = styled.div`
  position: absolute;
  top: -8px;
  right: -8px;
  text-align: center;
  line-height: 16px;
  width: 16px;
  height: 16px;
  border-radius: 8px;
  font-size: 12px;
  color: #fff;
  background-color: ${primary};
`;
