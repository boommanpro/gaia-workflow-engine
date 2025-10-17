/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import styled from 'styled-components';
import { Select } from '@douyinfe/semi-ui';

export const UIContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
`;

export const UIOperator = styled.div``;

export const UILeft = styled.div`
  width: 100%;
`;

export const UIRight = styled.div`
  width: 100%;
`;

export const UIValues = styled.div`
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
`;

export const UIOptionLabel = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;

export const UISelect = styled(Select)`
  & .semi-select-selection {
    margin-left: 5px;
  }
`;
