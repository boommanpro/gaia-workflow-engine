/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { vi, describe, test, expect } from 'vitest';

import {
  ASTMatch,
  ObjectType,
  NumberType,
  VariableEngine,
  StringType,
  VariableDeclarationList,
  BooleanType,
  IntegerType,
  MapType,
  ArrayType,
} from '../../src';
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
describe('test Basic Variable Declaration', () => {
  const container = getContainer();
  const variableEngine = container.get(VariableEngine);
  const testScope = variableEngine.createScope('test');

  test('test simple variable match', () => {
    const simpleCase = testScope.ast.set('simple case', simpleVariableList);

    if (!ASTMatch.isVariableDeclarationList(simpleCase)) {
      throw new Error('simpleCase is not a VariableDeclarationList');
    }
    expect(ASTMatch.isVariableDeclarationList(simpleCase)).toBeTruthy();
    expect(ASTMatch.is(simpleCase, VariableDeclarationList)).toBeTruthy();

    const stringDeclaration = simpleCase.declarations[0];
    const booleanDeclaration = simpleCase.declarations[1];
    const numberDeclaration = simpleCase.declarations[2];
    const integerDeclaration = simpleCase.declarations[3];
    const objectDeclaration = simpleCase.declarations[4];
    const mapDeclaration = simpleCase.declarations[5];
    const arrayProperty = testScope.output.globalVariableTable.getByKeyPath(['object', 'key4']);

    expect(ASTMatch.isString(stringDeclaration.type)).toBeTruthy();
    expect(ASTMatch.is(stringDeclaration.type, StringType)).toBeTruthy();

    expect(ASTMatch.isBoolean(booleanDeclaration.type)).toBeTruthy();
    expect(ASTMatch.is(booleanDeclaration.type, BooleanType)).toBeTruthy();

    expect(ASTMatch.isNumber(numberDeclaration.type)).toBeTruthy();
    expect(ASTMatch.is(numberDeclaration.type, NumberType)).toBeTruthy();

    expect(ASTMatch.isInteger(integerDeclaration.type)).toBeTruthy();
    expect(ASTMatch.is(integerDeclaration.type, IntegerType)).toBeTruthy();

    expect(ASTMatch.isObject(objectDeclaration.type)).toBeTruthy();
    expect(ASTMatch.is(objectDeclaration.type, ObjectType)).toBeTruthy();

    expect(ASTMatch.isMap(mapDeclaration.type)).toBeTruthy();
    expect(ASTMatch.is(mapDeclaration.type, MapType)).toBeTruthy();

    if (!ASTMatch.isProperty(arrayProperty)) {
      throw new Error('arrayProperty is not a Property');
    }
    expect(ASTMatch.isArray(arrayProperty.type)).toBeTruthy();
    expect(ASTMatch.is(arrayProperty.type, ArrayType)).toBeTruthy();
  });
});
