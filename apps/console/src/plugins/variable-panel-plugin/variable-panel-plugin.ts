/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import {
  ASTFactory,
  definePluginCreator,
  GlobalScope,
  VariableDeclaration,
} from '@flowgram.ai/free-layout-editor';
import { IJsonSchema, JsonSchemaUtils } from '@flowgram.ai/form-materials';

import iconVariable from '../../assets/icon-variable.png';

/**
 * 面板 UI 已迁至 components/variable-dock（panel-manager bottom 区，2026-11-05 方案 A）；
 * 本插件只保留全局变量作用域初始化与 Schema 读取入口。
 */

const fetchMockVariableFromRemote = async () => {
  await new Promise((resolve) => setTimeout(resolve, 1000));
  return {
    type: 'object',
    properties: {
      userId: { type: 'string' },
    },
  };
};

export type GetGlobalVariableSchema = () => IJsonSchema;
export const GetGlobalVariableSchema = Symbol('GlobalVariableSchemaGetter');

export const createVariablePanelPlugin = definePluginCreator<{ initialData?: IJsonSchema }>({
  onBind({ bind }) {
    bind(GetGlobalVariableSchema).toDynamicValue((ctx) => () => {
      const variable = ctx.container.get(GlobalScope).getVar() as VariableDeclaration;
      return JsonSchemaUtils.astToSchema(variable?.type);
    });
  },
  onInit(ctx, opts) {
    const globalScope = ctx.get(GlobalScope);

    if (opts.initialData) {
      globalScope.setVar(
        ASTFactory.createVariableDeclaration({
          key: 'global',
          meta: {
            title: 'Global',
            icon: iconVariable,
          },
          type: JsonSchemaUtils.schemaToAST(opts.initialData),
        })
      );
    } else {
      // You can also fetch global variable from remote
      fetchMockVariableFromRemote().then((v) => {
        globalScope.setVar(
          ASTFactory.createVariableDeclaration({
            key: 'global',
            meta: {
              title: 'Global',
              icon: iconVariable,
            },
            type: JsonSchemaUtils.schemaToAST(v),
          })
        );
      });
    }
  },
});
