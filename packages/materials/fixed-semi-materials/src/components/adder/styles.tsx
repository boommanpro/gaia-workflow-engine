/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import styled from 'styled-components';
import { IconPlusCircle } from '@douyinfe/semi-icons';

export const AdderWrap = styled.div<{ hovered?: boolean }>`
  width: ${(props) => (props.hovered ? 15 : 6)}px;
  height: ${(props) => (props.hovered ? 15 : 6)}px;
  background-color: rgb(143, 149, 158);
  color: #fff;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
`;

export const IconPlus = styled(IconPlusCircle)`
  color: #3370ff;
  background-color: #fff;
  border-radius: 15px;
`;
