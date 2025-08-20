/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { memo } from 'react';

import { LineSVG } from './line-svg';

export const WorkflowLineRender = memo(
  LineSVG,
  (prevProps, nextProps) => prevProps.version === nextProps.version
);
