/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { test, expect } from 'vitest';

import { ScopeChainTransformService } from '../src';
import { runFreeLayoutTest } from '../__mocks__/run-free-layout-test';
import { freeLayout1 } from '../__mocks__/free-layout-specs';

runFreeLayoutTest('Variable Free Layout transform empty', freeLayout1, {
  // 模拟清空作用域
  transformCovers: () => [],
  transformDeps: () => [],
  runExtraTest: (container) => {
    test('check has transformer', () => {
      const transformService = container.get(ScopeChainTransformService);
      expect(transformService.hasTransformer('VARIABLE_LAYOUT_CONFIG')).to.be.true;
    });
  },
});
