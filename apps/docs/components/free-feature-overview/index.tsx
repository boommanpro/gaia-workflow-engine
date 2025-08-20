/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import React from 'react';
import './index.less';

// https://github.com/web-infra-dev/rspress/issues/553
const FreeFeatureOverview = React.lazy(() =>
  import('@flowgram.ai/demo-free-layout').then((module) => ({
    default: module.DemoFreeLayout,
  }))
);

export { FreeFeatureOverview };
