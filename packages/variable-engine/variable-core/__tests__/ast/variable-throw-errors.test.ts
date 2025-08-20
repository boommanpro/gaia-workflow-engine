/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { describe, expect, test } from 'vitest';

import { VariableEngine } from '../../src/variable-engine';
import { ASTFactory } from '../../src/ast';
import { simpleVariableList } from '../../__mocks__/variables';
import { getContainer } from '../../__mocks__/container';

describe('Test Variable ThrowError', () => {
  const container = getContainer();
  const variableEngine = container.get(VariableEngine);
  const testScope = variableEngine.createScope('test');
  testScope.ast.set('simple case', simpleVariableList);

  test('throw error when call getByKeyPath in base type', () => {
    const stringVariable = testScope.output.getVariableByKey('string');
    expect(() => stringVariable?.type.getByKeyPath(['throw'])).toThrowError();
  });

  test('not throw error when variable is disposed for twice', () => {
    const stringVariable = testScope.output.getVariableByKey('string');

    expect(stringVariable?.disposed).toBeFalsy();

    // 删除所有变量
    testScope.ast.set(
      'simple case',
      ASTFactory.createVariableDeclarationList({ declarations: [] }),
    );

    expect(stringVariable?.disposed).toBeTruthy();
    stringVariable?.dispose();
    expect(stringVariable?.disposed).toBeTruthy();
  });

  test('not throw error when scope is disposed and fire its events', () => {
    const toDisposeScope = variableEngine.createScope('toDisposeTest');

    let eventCalledTimes = 0;
    toDisposeScope.event.on('test', () => eventCalledTimes++);

    toDisposeScope.refreshDeps();
    toDisposeScope.event.dispatch({ type: 'test' });
    expect(toDisposeScope.disposed).toBeFalsy();
    expect(eventCalledTimes).toBe(1);

    toDisposeScope.dispose();
    expect(toDisposeScope.disposed).toBeTruthy();
    toDisposeScope.event.dispatch({ type: 'test' });
    toDisposeScope.refreshDeps();
    expect(eventCalledTimes).toBe(1);
  });

  test('not throw error when ast is disposed and fire its events', () => {
    const toDisposeAST = testScope.ast.set(
      'dispose case',
      ASTFactory.createVariableDeclaration({
        key: 'toDispose',
        type: ASTFactory.createString(),
      }),
    );

    let changeTimes = 0;
    toDisposeAST.subscribe(() => changeTimes++);

    toDisposeAST.fromJSON({
      key: 'toDispose',
      type: ASTFactory.createNumber(),
    });
    expect(changeTimes).toBe(1);
    expect(toDisposeAST.disposed).toBeFalsy();

    testScope.ast.remove('dispose case');
    expect(toDisposeAST.disposed).toBeTruthy();
    toDisposeAST.fireChange();
    expect(changeTimes).toBe(1);
  });
});
