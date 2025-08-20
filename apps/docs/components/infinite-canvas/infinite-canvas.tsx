/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import React from 'react';
import './index.less';

const InfiniteCanvas = React.lazy(() =>
  import('@flowgram.ai/demo-playground').then((module) => ({
    default: module.PlaygroundEditor,
  }))
);

export { InfiniteCanvas };
