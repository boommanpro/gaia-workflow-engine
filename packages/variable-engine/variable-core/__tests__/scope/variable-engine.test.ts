/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { vi, describe, test, expect } from 'vitest';

import { VariableEngine } from '../../src';
import { simpleVariableList } from '../../__mocks__/variables';
import { getContainer } from '../../__mocks__/container';

vi.mock('nanoid', () => {
  let mockId = 0;
  return {
    nanoid: () => 'mocked-id-' + mockId++,
  };
});

/**
 * 测试基本的变量声明场景
 */
describe('test Variable Engine', () => {
  const container = getContainer();
  const variableEngine = container.get(VariableEngine);
  const globalVariableTable = variableEngine.globalVariableTable;
  const testScope = variableEngine.createScope('test');
  const simpleCase = testScope.ast.set('simple case', simpleVariableList);

  test('test variable Engine Dispose', () => {
    // unbind All will trigger @preDestroy
    container.unbindAll();

    expect(variableEngine.chain.disposed).toBeTruthy();
    expect(testScope.disposed).toBeTruthy();
    expect(simpleCase.disposed).toBeTruthy();
    expect(globalVariableTable.variableKeys.length).toBe(0);
  });
});
