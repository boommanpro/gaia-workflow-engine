/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { vi, describe, test, expect } from 'vitest';

import { ASTKind, VariableEngine, VariableDeclaration, ASTFactory } from '../../src';
import { getContainer } from '../../__mocks__/container';

const {
  createVariableDeclaration,
  createObject,
  createProperty,
  createString,
  createNumber,
  createKeyPathExpression,
  createArray,
  createEnumerateExpression,
} = ASTFactory;

vi.mock('nanoid', () => {
  let mockId = 0;
  return {
    nanoid: () => 'mocked-id-' + mockId++,
  };
});

/**
 * 测试通过表达式生成的变量
 */
describe('test Variable With Initializer', () => {
  const container = getContainer();
  const variableEngine = container.get(VariableEngine);
  const globalScope = variableEngine.createScope('global');
  const testScope = variableEngine.createScope('test');

  const globalTestVariable = globalScope.ast.set<VariableDeclaration>(
    'test',
    createVariableDeclaration({
      key: 'source',
      type: createObject({
        properties: [
          createProperty({
            key: 'a',
            type: createString(),
          }),
          createProperty({
            key: 'b',
            type: createNumber(),
          }),
        ],
      }),
    }),
  );

  test('test depScopes', () => {
    expect(testScope.depScopes.map(_scope => _scope.id)).toEqual(['global']);
  });

  test('init const test_key_path = source.a', () => {
    const variableByKeyPath = testScope.ast.set<VariableDeclaration>(
      'variableByKeyPath',
      createVariableDeclaration({
        key: 'test_key_path',
        initializer: createKeyPathExpression({
          keyPath: ['source', 'a'],
        }),
      }),
    )!;

    expect(variableByKeyPath.initializer?.kind).toEqual(ASTKind.KeyPathExpression);
    expect(variableByKeyPath.initializer?.refs.map(_ref => _ref?.key)).toEqual(['a']);
    expect(variableByKeyPath.initializer?.parentFields.map(_field => _field?.key)).toEqual([
      'test_key_path',
    ]);
    expect(variableByKeyPath.type.toJSON()).toEqual({ kind: ASTKind.String });
    expect(variableByKeyPath.toJSON()).toMatchSnapshot();
  });

  test('subscribe variable changes by expression', () => {
    // const variableByKeyPath = source.a;
    const variableByKeyPath = testScope.output.getVariableByKey('test_key_path')!;

    let typeChangeTimes = 0;
    variableByKeyPath.onTypeChange(type => {
      typeChangeTimes++;
      expect([typeChangeTimes, type?.toJSON()]).toMatchSnapshot();
    });

    // source.a 发生变化时，则响应更新变量
    // source.a -> boolean
    globalTestVariable.getByKeyPath(['a'])?.updateType(ASTKind.Boolean);
    expect(variableByKeyPath.type.toJSON()).toEqual({ kind: ASTKind.Boolean });
    expect(typeChangeTimes).toBe(1);

    // 改成引用 source.b，响应更新变量
    // const variableByKeyPath = source.b;
    variableByKeyPath.updateInitializer({
      kind: ASTKind.KeyPathExpression,
      keyPath: ['source', 'b'],
    });
    expect(variableByKeyPath.type.toJSON()).toEqual({ kind: ASTKind.Number });
    expect(typeChangeTimes).toBe(2);

    // source.b 被删除，变量类型变为空
    globalTestVariable.type.fromJSON({
      properties: [
        {
          key: 'a',
          type: ASTKind.String,
        },
      ],
    });

    expect(variableByKeyPath.type).toBeUndefined();
    expect(typeChangeTimes).toBe(3);

    // source.b 加回来，变量类型变回来且触发表达式更新
    globalTestVariable.type.fromJSON(
      createObject({
        properties: [
          createProperty({ key: 'a', type: createString() }),
          createProperty({ key: 'b', type: createNumber() }),
        ],
      }),
    );
    expect(variableByKeyPath.type.toJSON()).toEqual({ kind: ASTKind.Number });
    expect(typeChangeTimes).toBe(4);

    // 改成 EnumerateExpression
    variableByKeyPath.updateInitializer(
      createEnumerateExpression({
        enumerateFor: createKeyPathExpression({
          keyPath: ['source', 'b'],
        }),
      }),
    );
    expect(variableByKeyPath.type).toBeUndefined();
    expect(variableByKeyPath.initializer?.refs).toEqual([]);
    variableByKeyPath.initializer?.refreshRefs();
    expect(variableByKeyPath.initializer?.refs).toEqual([]);
    expect(typeChangeTimes).toBe(5);

    // 数组下钻，类型也会更新
    globalTestVariable.type.fromJSON(
      createObject({
        properties: [
          createProperty({
            key: 'b',
            type: createArray({
              items: createNumber(),
            }),
          }),
        ],
      }),
    );
    expect(variableByKeyPath.type.toJSON()).toEqual({ kind: ASTKind.Number });
    expect(typeChangeTimes).toBe(6);
    expect(variableByKeyPath.toJSON()).toMatchSnapshot();

    // 原作用域删除，显示为空类型
    globalScope.dispose();
    expect(variableByKeyPath.scope.depScopes.map(_scope => _scope.id)).toEqual([]);
    expect(variableByKeyPath.type).toBeUndefined();
    expect(typeChangeTimes).toBe(7);
  });
});
