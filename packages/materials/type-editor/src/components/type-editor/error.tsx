/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { type FC } from 'react';
import React from 'react';

import styled from 'styled-components';

const TopLine = styled.div<{
  level?: 'error' | 'warning';
}>`
  position: absolute;
  background-color: ${(props) =>
    props.level === 'warning' ? 'var(--semi-color-warning)' : 'var(--semi-color-danger)'};
  width: 100%;
  height: 1px;
  top: 0;
  left: 0;
`;

const BottomLine = styled.div<{
  level?: 'error' | 'warning';
}>`
  position: absolute;
  background-color: ${(props) =>
    props.level === 'warning' ? 'var(--semi-color-warning)' : 'var(--semi-color-danger)'};
  width: 100%;
  height: 1px;
  bottom: -1px;
  left: 0;
`;

const RightLine = styled.div<{
  level?: 'error' | 'warning';
}>`
  position: absolute;
  background-color: ${(props) =>
    props.level === 'warning' ? 'var(--semi-color-warning)' : 'var(--semi-color-danger)'};
  height: calc(100% + 1px);
  width: 1px;
  bottom: -1px;
  right: 0px;
`;

const LeftLine = styled.div<{
  level?: 'error' | 'warning';
}>`
  position: absolute;
  background-color: ${(props) =>
    props.level === 'warning' ? 'var(--semi-color-warning)' : 'var(--semi-color-danger)'};
  height: calc(100% + 1px);
  width: 1px;
  bottom: -1px;
  left: 0;
`;

export const ErrorCellBorder: FC<{
  level?: 'error' | 'warning';
}> = ({ level }) => (
  <>
    <TopLine level={level} />
    <BottomLine level={level} />
    <LeftLine level={level} />
    <RightLine level={level} />
  </>
);
