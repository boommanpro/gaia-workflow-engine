/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { describe, expect, test } from 'vitest';
import { VariableEngine } from '@flowgram.ai/variable-core';
import { ASTKind } from '@flowgram.ai/variable-core';
import { FlowDocument, FlowDocumentJSON } from '@flowgram.ai/document';
import {
  FlowNodeVariableData,
} from '../src';
import { TestConfig, getContainer } from './container'

export const runFixedLayoutTest = (testName:string, spec: FlowDocumentJSON, config?: TestConfig) => {
  describe(testName, () => {
    const container = getContainer('fixed', config);
    const flowDocument = container.get(FlowDocument);
    const variableEngine = container.get(VariableEngine);

    variableEngine.onScopeChange(action => {
      const { type, scope } = action;

      // 作用域默认创建一个默认变量
      if (type === 'add') {
        scope.ast.set('/', {
          kind: ASTKind.VariableDeclaration,
          type: ASTKind.String,
          key: String(scope.id),
        });
      }
    });

    // 创建一个测试作用域
    variableEngine.createScope('testScope');

    const traverseVariableDatas = () =>
      flowDocument
        .getAllNodes()
        // TODO 包含 $ 的节点不注册 variableData
        .filter(_node => !_node.id.startsWith('$'))
        .map(_node => _node.getData(FlowNodeVariableData))
        .filter(Boolean);

    // 初始化所有节点的私有作用域
    const initAllNodePrivate = () => {
      traverseVariableDatas().forEach(_data => {
        _data.initPrivate();
      });
    };

    // 初始化所有节点的可用变量
    const printAllNodeAvailableMapping = (_scopeType: 'public' | 'private' = 'public') =>
      traverseVariableDatas().reduce((acm, _data) => {
        const scope = _data[_scopeType]!;
        acm.set(String(scope.id), scope.available.variableKeys);

        return acm;
      }, new Map<string, string[]>());

    // 初始化所有节点的覆盖作用域
    const printAllCovers = (_scopeType: 'public' | 'private' = 'public') =>
      traverseVariableDatas().reduce((acm, _data) => {
        const scope = _data[_scopeType]!;
        acm.set(
          String(scope.id),
          scope.coverScopes.map(_scope => String(_scope.id)),
        );

        return acm;
      }, new Map<string, string[]>());

    flowDocument.fromJSON(spec);

    test('test get Deps', () => {
      expect(printAllNodeAvailableMapping()).toMatchSnapshot();
    });

    test('test get Covers', () => {
      expect(printAllCovers()).toMatchSnapshot();
    });

    test('test get Deps After Init Private', () => {
      initAllNodePrivate();
      expect(printAllNodeAvailableMapping()).toMatchSnapshot();
    });

    test('test get private scope Deps', () => {
      expect(printAllNodeAvailableMapping('private')).toMatchSnapshot();
    });

    test('test get Covers After Init Private', () => {
      expect(printAllCovers()).toMatchSnapshot();
    });

    test('test get private scope Covers', () => {
      expect(printAllCovers('private')).toMatchSnapshot();
    });

    test('test sort', () => {
      expect(variableEngine.getAllScopes({ sort: true }).map(_scope => _scope.id)).toMatchSnapshot();
    });

    config?.runExtraTest?.(container);
  });


}
