/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { runFixedLayoutTest } from '../__mocks__/run-fixed-layout-test';
import { fixLayout1 } from '../__mocks__/fixed-layout-specs';

runFixedLayoutTest('Variable Fix Layout', fixLayout1, {
  isNodeChildrenPrivate: (node) =>
    // 只有循环是 private
    node.flowNodeType === 'loop',
});
