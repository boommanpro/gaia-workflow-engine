/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { describe, expect, test } from 'vitest';

import { VariableEngine } from '../../src/variable-engine';
import { ASTFactory, ASTKind, CustomType, VariableDeclaration } from '../../src/ast';
import { getContainer } from '../../__mocks__/container';

const {
  createObject,
  createNumber,
  createInteger,
  createBoolean,
  createString,
  createArray,
  createCustomType,
  createMap,
  createProperty,
  createUnion,
  create,
} = ASTFactory;

describe('Test Variable Type Equal', () => {
  const container = getContainer();
  const variableEngine = container.get(VariableEngine);
  const testScope = variableEngine.createScope('test');

  const testObject1 = createObject({
    properties: [
      createProperty({ key: 'a', type: createString() }),
      createProperty({ key: 'b', type: createNumber() }),
      createProperty({ key: 'c', type: createBoolean() }),
      createProperty({ key: 'd', type: createObject({}) }),
      createProperty({ key: 'e', type: createArray({}) }),
      createProperty({ key: 'f', type: createMap({}) }),
      createProperty({ key: 'g', type: createCustomType({ typeName: 'Custom' }) }),
    ],
  });

  const testObject2 = createObject({
    properties: [
      createProperty({ key: 'a', type: createString() }),
      createProperty({ key: 'b', type: createInteger() }),
      createProperty({ key: 'c', type: createBoolean() }),
    ],
  });

  const testObject3 = createObject({
    properties: [
      createProperty({ key: 'a', type: createString() }),
      createProperty({ key: 'b', type: testObject2 }),
      createProperty({
        key: 'c',
        type: createArray({
          items: testObject2,
        }),
      }),
      createProperty({
        key: 'd',
        type: createArray({ items: createString() }),
      }),
      createProperty({
        key: 'e',
        type: createMap({
          valueType: createNumber(),
        }),
      }),
      createProperty({
        key: 'f',
        type: createMap({
          valueType: createString(),
        }),
      }),
    ],
  });

  const variable1: VariableDeclaration = testScope.ast.set('variable1', {
    kind: ASTKind.VariableDeclaration,
    key: 'variable1',
    type: testObject1,
  });

  const variable2: VariableDeclaration = testScope.ast.set('variable2', {
    kind: ASTKind.VariableDeclaration,
    key: 'variable2',
    type: testObject2,
  });

  const variable3: VariableDeclaration = testScope.ast.set('variable3', {
    kind: ASTKind.VariableDeclaration,
    key: 'variable3',
    type: testObject3,
  });

  test('Test Simple Equal', () => {
    expect(variable1.type.isTypeEqual(testObject1)).toBeTruthy();
    expect(variable2.type.isTypeEqual(testObject2)).toBeTruthy();
    expect(variable3.type.isTypeEqual(testObject3)).toBeTruthy();

    expect(variable1.type.isTypeEqual(testObject2)).toBeFalsy();
    expect(variable2.type.isTypeEqual(testObject3)).toBeFalsy();
  });

  test('Test Union Type Equal', () => {
    expect(
      variable1.type.isTypeEqual(
        createUnion({
          types: [testObject1, testObject2, testObject3],
        })
      )
    ).toBeTruthy();

    expect(
      variable2.type.isTypeEqual(
        createUnion({
          types: [testObject1, testObject2, testObject3],
        })
      )
    ).toBeTruthy();

    expect(
      variable3.type.isTypeEqual(
        createUnion({
          types: [testObject1, testObject2, testObject3],
        })
      )
    ).toBeTruthy();

    expect(variable1.type.isTypeEqual({ kind: ASTKind.Union })).toBeFalsy();
  });

  test('Test Union Type Equal In Child Properties', () => {
    const UnionBasicTypes = createUnion({
      types: [ASTKind.String, ASTKind.Number, ASTKind.Boolean],
    });

    expect(
      variable2.type.isTypeEqual({
        kind: ASTKind.Object,
        properties: [
          {
            key: 'a',
            type: UnionBasicTypes,
          },
          {
            key: 'b',
            type: UnionBasicTypes,
          },
          {
            key: 'c',
            type: UnionBasicTypes,
          },
        ],
      })
    );
  });

  test('Test Weak Compare', () => {
    expect(variable1.type.isTypeEqual({ kind: ASTKind.Object, weak: true })).toBeTruthy();
    expect(variable2.type.isTypeEqual({ kind: ASTKind.Object, weak: true })).toBeTruthy();
    expect(variable3.type.isTypeEqual({ kind: ASTKind.Object, weak: true })).toBeTruthy();

    expect(
      variable3.getByKeyPath(['c'])?.type.isTypeEqual({ kind: ASTKind.Array, weak: true })
    ).toBeTruthy();
    expect(
      variable3.getByKeyPath(['d'])?.type.isTypeEqual({ kind: ASTKind.Array, weak: true })
    ).toBeTruthy();
    expect(
      variable3.getByKeyPath(['e'])?.type.isTypeEqual({ kind: ASTKind.Map, weak: true })
    ).toBeTruthy();
    expect(
      variable3.getByKeyPath(['f'])?.type.isTypeEqual({ kind: ASTKind.Map, weak: true })
    ).toBeTruthy();
  });

  test('CustomType Equal', () => {
    const customType1 = createCustomType({ typeName: 'Custom' });
    const customType2 = createCustomType({ typeName: 'Custom2' });
    const customType3 = create(CustomType, { typeName: 'Custom' });
    const unionCustomTypes = createUnion({
      types: [customType1, customType2],
    });

    const customTypeProperty = variable1.getByKeyPath(['g'])?.type;

    expect(customTypeProperty?.isTypeEqual(customType1)).toBeTruthy();
    expect(customTypeProperty?.isTypeEqual(customType2)).toBeFalsy();
    expect(customTypeProperty?.isTypeEqual(customType3)).toBeTruthy();
    expect(customTypeProperty?.isTypeEqual(unionCustomTypes)).toBeTruthy();
  });
});
