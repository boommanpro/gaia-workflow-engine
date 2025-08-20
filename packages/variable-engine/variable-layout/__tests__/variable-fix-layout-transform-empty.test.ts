/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { test, expect } from 'vitest';

import { ScopeChainTransformService } from '../src';
import { runFixedLayoutTest } from '../__mocks__/run-fixed-layout-test';
import { freeLayout1 } from '../__mocks__/free-layout-specs';

runFixedLayoutTest('Variable Fixed Layout transform empty', freeLayout1, {
  onInit(container) {
    const transformService = container.get(ScopeChainTransformService);

    transformService.registerTransformer('MOCK', {
      transformCovers: (scopes) => scopes,
      transformDeps: (scopes) => scopes,
    });

    // again transformer, prevent duplicated transformerId
    transformService.registerTransformer('MOCK', {
      transformCovers: () => [],
      transformDeps: () => [],
    });
    transformService.registerTransformer('MOCK', {
      transformCovers: () => [],
      transformDeps: () => [],
    });
  },
  runExtraTest: (container) => {
    test('check has transformer', () => {
      const transformService = container.get(ScopeChainTransformService);
      expect(transformService.hasTransformer('MOCK')).to.be.true;
      expect(transformService.hasTransformer('VARIABLE_LAYOUT_CONFIG')).to.be.false;
      expect(transformService.hasTransformer('NOT_EXIST')).to.be.false;
    });
  },
});
