/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { FlowNodeScope } from '../src/types';
import { runFixedLayoutTest } from '../__mocks__/run-fixed-layout-test';
import { fixLayout1 } from '../__mocks__/fixed-layout-specs';

const filterStart = (_scope: FlowNodeScope) => !['start'].includes(_scope.meta?.node?.id || '');

const filterEnd = (_scope: FlowNodeScope) => !['end'].includes(_scope.meta?.node?.id || '');

runFixedLayoutTest('Variable Fix Layout Filter Start End', fixLayout1, {
  transformCovers: (scopes) => scopes.filter(filterEnd),
  transformDeps: (scopes) => scopes.filter(filterStart),
});
