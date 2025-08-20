/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import styled from 'styled-components';

export const Container = styled.div<{
  hoverActivated?: boolean;
  isVertical?: boolean;
  isCollapse?: boolean;
}>`
  width: 16px;
  height: 16px;
  font-size: 10px;
  border-radius: 9px;
  display: flex;
  color: #fff;
  cursor: pointer;
  justify-content: center;
  align-items: center;
  background: ${(props) => (props.hoverActivated ? '#82A7FC' : '#BBBFC4')};
  transform: ${(props) => (!props.isVertical && props.isCollapse ? 'rotate(-90deg)' : '')};
`;
