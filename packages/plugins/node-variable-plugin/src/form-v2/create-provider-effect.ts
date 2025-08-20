/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { FlowNodeVariableData, type Scope, ASTKind } from '@flowgram.ai/variable-plugin';
import { DataEvent, type Effect, type EffectOptions } from '@flowgram.ai/node';
import { FlowNodeEntity } from '@flowgram.ai/document';

import { type VariableProviderAbilityOptions } from '../types';

/**
 * 根据 VariableProvider 生成 FormV2 的 Effect
 * @param options
 * @returns
 */
export function createEffectFromVariableProvider(
  options: VariableProviderAbilityOptions
): EffectOptions[] {
  const getScope = (node: FlowNodeEntity): Scope => {
    const variableData: FlowNodeVariableData = node.getData(FlowNodeVariableData);

    if (options.private) {
      return variableData.initPrivate();
    }
    return variableData.public;
  };

  const transformValueToAST: Effect = ({ value, context }) => {
    if (!context) {
      return;
    }
    const { node } = context;
    const scope = getScope(node);

    scope.ast.set(options.namespace || '', {
      kind: ASTKind.VariableDeclarationList,
      declarations: options.parse(value, {
        node,
        scope,
        options,
        formItem: undefined,
      }),
    });
  };

  return [
    {
      event: DataEvent.onValueInit,
      effect: ((params) => {
        const { context } = params;

        const scope = getScope(context.node);
        const disposable = options.onInit?.({
          node: context.node,
          scope,
          options,
          formItem: undefined,
        });

        if (disposable) {
          // 作用域销毁时同时销毁该监听
          scope.toDispose.push(disposable);
        }

        transformValueToAST(params);
      }) as Effect,
    },
    {
      event: DataEvent.onValueChange,
      effect: ((params) => {
        transformValueToAST(params);
      }) as Effect,
    },
  ];
}
