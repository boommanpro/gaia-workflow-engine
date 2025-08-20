/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

import { OperationRegistry, Operation, OperationService } from '../src';
import { createHistoryContainer } from '../__mocks__/history-container.mock';

const fn = vi.fn();

describe('operation-service', () => {
  let operationRegistry: OperationRegistry;
  let operationService: OperationService;
  let container;
  beforeEach(() => {
    container = createHistoryContainer();
    operationService = container.get(OperationService);
    operationRegistry = container.get(OperationRegistry);
    const operationMeta = {
      type: 'test',
      inverse: (op: Operation) => op,
      description: 'test',
      apply: fn,
      getLabel: () => 'test1',
    };
    operationRegistry.registerOperationMeta(operationMeta);
  });

  it('get operation label should return correct label', () => {
    expect(operationService.getOperationLabel({ type: 'test' } as any)).toEqual('test1');
  });

  it('no apply', () => {
    operationService.applyOperation({ type: 'test' } as any, { noApply: true });
    expect(fn).toBeCalledTimes(0);
    operationService.applyOperation({ type: 'test' } as any, { noApply: false });
    expect(fn).toBeCalledTimes(1);
    operationService.applyOperation({ type: 'test' } as any);
    expect(fn).toBeCalledTimes(2);
  });

  it('on apply', () => {
    const handleApply = vi.fn();
    operationService.onApply(handleApply);
    operationService.applyOperation({ type: 'test' } as any);
    expect(handleApply).toBeCalledTimes(1);
    operationService.applyOperation({ type: 'test' } as any, { noApply: true });
    expect(handleApply).toBeCalledTimes(2);
  });

  it('apply with origin', () => {
    const handleApply = vi.fn();
    operationService.onApply(handleApply);
    const op = { type: 'test', origin: Symbol('origin'), value: {} };
    operationService.applyOperation(op);
    expect(handleApply).toBeCalledWith(op);
  });
});
