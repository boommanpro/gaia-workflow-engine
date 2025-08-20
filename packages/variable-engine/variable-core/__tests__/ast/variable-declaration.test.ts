/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { vi, describe, test, expect } from 'vitest';

import {
  ASTKind,
  ASTMatch,
  ObjectType,
  NumberType,
  VariableEngine,
  VariableDeclaration,
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
  const globalVariableTable = variableEngine.globalVariableTable;
  const testScope = variableEngine.createScope('test');

  test('test simple variable declarations', () => {
    const simpleCase = testScope.ast.set('simple case', simpleVariableList);
    expect(simpleCase?.toJSON()).toMatchSnapshot();
  });

  test('test globalVariableTable variables', () => {
    expect(globalVariableTable.variables.map((_v) => _v.key)).toMatchSnapshot();
  });

  test('test get variable by key path', () => {
    const undefinedCases = [
      ['object', 'key2', 'unExisted'],
      ['unExisted'],
      ['string', 'drilldownString'],
      ['object', 'key1', 'drilldownString'],
      ['object', 'key4', 'unExistedKeyInArray', 'key1'],
    ];

    const availableCases: [string[], string][] = [
      [['object', 'key2', 'key1'], ASTKind.Number],
      [['object', 'key4', '0', 'key1'], ASTKind.Boolean],
    ];

    availableCases.forEach(([_case, _resType]) => {
      expect(globalVariableTable.getByKeyPath(_case)?.type.kind).toEqual(_resType);
    });

    undefinedCases.forEach((_case) => {
      expect(globalVariableTable.getByKeyPath(_case)).toBeUndefined();
    });
  });

  test('test remove variable, update variable, add variable by from a new json', () => {
    const previousVariable1 = globalVariableTable.getByKeyPath(['object', 'key2', 'key1'])!;
    const previousVariable2 = globalVariableTable.getByKeyPath(['integer'])!;
    const previousVariable3 = globalVariableTable.getByKeyPath(['object', 'key4'])!;

    testScope.ast.set('simple case', {
      kind: ASTKind.VariableDeclarationList,
      declarations: [
        {
          kind: ASTKind.VariableDeclaration,
          type: ASTKind.Integer,
          key: 'new_integer',
        },
        {
          kind: ASTKind.VariableDeclaration,
          key: 'object',
          type: {
            kind: ASTKind.Object,
            properties: [
              {
                key: 'key2',
                type: {
                  kind: ASTKind.Object,
                },
              },
              {
                key: 'key4',
                type: ASTKind.String,
              },
              {
                key: 'key5',
                type: ASTKind.Array,
              },
            ],
          },
        },
      ],
    });
    expect(previousVariable1.disposed).toBe(true);
    expect(previousVariable2.disposed).toBe(true);
    expect(previousVariable3.disposed).toBe(false);
    expect(previousVariable3.version).toBe(1); // 更新次数为一次
    expect(testScope.ast.version).toBe(2); // 调用了两次 fromJSON，因此更新了两次
    expect(globalVariableTable.variables.map((_v) => _v.key)).toMatchSnapshot();
    expect(globalVariableTable.version).toBe(2 + 1); // 调用了两次 fromJSON + Object 变量的下钻发生变化，因此 version 是 2 + 1
    expect(testScope.available.variables.map((_v) => _v.key)).toMatchSnapshot();
  });

  test('remove variables', () => {
    let isOutputChanged = false;
    let isAnyVariableChanged = false;
    testScope.output.onDataChange(() => {
      isOutputChanged = true;
    });
    testScope.output.onAnyVariableChange(() => {
      isAnyVariableChanged = true;
    });

    // 删除所有变量
    testScope.ast.set('simple case', {
      kind: ASTKind.VariableDeclarationList,
      declarations: [],
    });

    expect(isOutputChanged).toBeTruthy();
    expect(isAnyVariableChanged).toBeFalsy();
  });

  test('variable declaration subscribe', () => {
    const declaration: VariableDeclaration = testScope.ast.set('subscribeTest', {
      kind: ASTKind.VariableDeclaration,
      type: ASTKind.String,
      ui: { label: 'test Label' },
    })!;

    let declarationChangeTimes = 0;
    let typeChangeTimes = 0;
    let outputChangeTimes = 0;
    let anyVariableChangeTimes = 0;

    testScope.output.onDataChange(() => {
      outputChangeTimes++;
    });
    testScope.output.onAnyVariableChange(() => {
      anyVariableChangeTimes++;
    });
    declaration.subscribe(() => {
      declarationChangeTimes++;
    });
    declaration.onTypeChange((type) => {
      expect(type?.toJSON()).toMatchSnapshot();
      typeChangeTimes++;
    });

    declaration.fromJSON({
      type: ASTKind.String,
      meta: { label: 'test New Label' },
    });
    expect(declarationChangeTimes).toBe(1);
    expect(anyVariableChangeTimes).toBe(1);
    expect(typeChangeTimes).toBe(0);
    expect(outputChangeTimes).toBe(0);
    expect(declaration.meta.label).toEqual('test New Label');

    declaration.fromJSON({
      type: ASTKind.Number,
      meta: { label: 'test Label' },
    });
    expect(ASTMatch.is(declaration.type, NumberType)).toBeTruthy();
    expect(declarationChangeTimes).toBe(2);
    expect(anyVariableChangeTimes).toBe(2);
    expect(typeChangeTimes).toBe(1);
    expect(outputChangeTimes).toBe(0);
    expect(declaration.meta.label).toEqual('test Label');

    declaration.fromJSON({
      type: {
        kind: ASTKind.Object,
        properties: [
          {
            key: 'key1',
            type: ASTKind.String,
          },
        ],
      },
      meta: { label: 'test Label' },
    });
    expect(ASTMatch.is(declaration.type, ObjectType)).toBeTruthy();
    expect(declarationChangeTimes).toBe(3);
    expect(anyVariableChangeTimes).toBe(3);
    expect(typeChangeTimes).toBe(2);
    expect(outputChangeTimes).toBe(0);

    // 变量下钻字段变换类型，变量也会更新
    const key1Variable = (declaration.type as ObjectType).getByKeyPath(['key1']);
    key1Variable?.updateType(ASTKind.Number);
    expect(declarationChangeTimes).toBe(4);
    expect(anyVariableChangeTimes).toBe(4);
    expect(typeChangeTimes).toBe(3);
    expect(outputChangeTimes).toBe(0);
  });
});
