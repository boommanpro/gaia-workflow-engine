/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import React from 'react';

import { NodeErrorRenderProps } from '../types';

const ERROR_STYLE = {
  color: '#f54a45',
};

export const defaultErrorRender = ({ error }: NodeErrorRenderProps) => (
  <div style={ERROR_STYLE}>{error.message}</div>
);
