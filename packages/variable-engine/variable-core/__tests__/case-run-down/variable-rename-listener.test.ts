/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { vi, describe, test, beforeEach, expect } from 'vitest';
import { cloneDeep } from 'lodash-es';

import { ASTNode, ASTNodeFlags, VariableEngine, VariableFieldKeyRenameService } from '../../src';
import { simpleVariableList } from '../../__mocks__/variables';
import { getContainer } from '../../__mocks__/container';

vi.mock('nanoid', () => {
  let mockId = 0;
  return {
    nanoid: () => 'mocked-id-' + mockId++,
  };
});

function getFieldKeys(node: ASTNode): string[] {
  let _curr = node?.parent;
  const parentKeys: string[] = [];

  while (_curr) {
    if (_curr.flags & ASTNodeFlags.VariableField) {
      parentKeys.unshift(_curr.key);
    }
    _curr = _curr.parent;
  }

  return [...parentKeys, node.key];
}

/**
 * 测试变量 Key Rename 的场景
 */
describe('test Listen Variable Key Rename', () => {
  const container = getContainer();
  const variableEngine = container.get(VariableEngine);
  const renameService = container.get(VariableFieldKeyRenameService);

  const testScope = variableEngine.createScope('test');

  let renameInfo: { before: string[]; after: string[] } | null = null;
  let disposeList: string[][] = [];

  renameService.onRename((_rename) => {
    renameInfo = {
      before: getFieldKeys(_rename.before),
      after: getFieldKeys(_rename.after),
    };
  });

  renameService.onDisposeInList((_field) => {
    disposeList.push(getFieldKeys(_field));
  });

  beforeEach(() => {
    testScope.ast.set('test', simpleVariableList);
    renameInfo = null;
    disposeList = [];
  });

  const produceNextJSON = (producer: (json: any) => void) => {
    const next = cloneDeep(simpleVariableList);
    producer(next);
    return next;
  };

  test.each([
    // 更改一个字段
    [
      produceNextJSON((json) => {
        json.declarations[0].key = 'string1111';
      }),
      ['string'],
      ['string1111'],
      [],
    ],
    // 更改一个下钻字段
    [
      produceNextJSON((json) => {
        json.declarations[4].type.properties[0].key = 'changedKey';
      }),
      ['object', 'key1'],
      ['object', 'changedKey'],
      [],
    ],
    // 更改字段和他的类型
    [
      produceNextJSON((json) => {
        json.declarations[0].key = 'string1111';
        json.declarations[0].type = 'Number';
      }),
      null,
      null,
      [['string']],
    ],
    // 更改多个下钻字段
    [
      produceNextJSON((json) => {
        json.declarations[4].type.properties[0].key = 'changedKey';
        json.declarations[4].type.properties[1].key = 'changedKey222';
      }),
      null,
      null,
      [
        ['object', 'key1'],
        ['object', 'key2'],
      ],
    ],
    // 更改多个字段
    [
      produceNextJSON((json) => {
        json.declarations[0].key = 'string1111';
        json.declarations[1].key = 'boolean1111';
      }),
      null,
      null,
      [['string'], ['boolean']],
    ],
    // 删除变量
    [
      produceNextJSON((json) => {
        json.declarations = json.declarations.slice(1);
      }),
      null,
      null,
      [['string']],
    ],
    // 添加变量
    [
      produceNextJSON((json) => {
        json.declarations.push({ kind: 'String', key: 'newKey' });
      }),
      null,
      null,
      [],
    ],
  ])('test variable change', (_json, _before, _after, _disposeList) => {
    testScope.ast.set('test', _json);
    expect(renameInfo?.before || null).toEqual(_before);
    expect(renameInfo?.after || null).toEqual(_after);
    expect(disposeList).toEqual(_disposeList);
  });
});
