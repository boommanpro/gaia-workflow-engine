/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { describe, it, expect, beforeEach } from 'vitest';

import { OperationRegistry, Operation } from '../src';
import { createHistoryContainer } from '../__mocks__/history-container.mock';
import { insertNodeOperationMeta } from '../__mocks__/editor.mock';

describe('operation-registry', () => {
  let operationRegistry: OperationRegistry;
  let container;
  beforeEach(() => {
    container = createHistoryContainer();
    operationRegistry = container.get(OperationRegistry);
  });

  it('registerOperationMeta success should return correct operationMeta', () => {
    const operationMeta = {
      type: 'test',
      inverse: (op: Operation) => op,
      label: 'test',
      description: 'test',
      apply: () => {},
    };
    operationRegistry.registerOperationMeta(operationMeta);
    expect(operationRegistry.getOperationMeta(operationMeta.type)).toEqual(operationMeta);
  });

  it('register by contribution success should return correct operationMeta', () => {
    expect(operationRegistry.getOperationMeta(insertNodeOperationMeta.type)).toEqual(
      insertNodeOperationMeta,
    );
  });
});
