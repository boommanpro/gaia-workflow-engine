/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import React from 'react';

// https://github.com/web-infra-dev/rspress/issues/553
const FreeLayoutSimple = React.lazy(() =>
  import('@flowgram.ai/demo-free-layout-simple').then((module) => ({
    default: module.DemoFreeLayout,
  }))
);

export { FreeLayoutSimple };
