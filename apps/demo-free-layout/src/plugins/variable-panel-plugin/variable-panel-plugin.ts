/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { ASTFactory, definePluginCreator, GlobalScope } from '@flowgram.ai/free-layout-editor';
import { JsonSchemaUtils } from '@flowgram.ai/form-materials';

import iconVariable from '../../assets/icon-variable.png';
import { VariablePanelLayer } from './variable-panel-layer';

const fetchMockVariableFromRemote = async () => {
  await new Promise((resolve) => setTimeout(resolve, 1000));
  return {
    type: 'object',
    properties: {
      userId: { type: 'string' },
    },
  };
};

export const createVariablePanelPlugin = definePluginCreator({
  onInit(ctx) {
    ctx.playground.registerLayer(VariablePanelLayer);

    // Fetch Global Variable
    fetchMockVariableFromRemote().then((v) => {
      ctx.get(GlobalScope).setVar(
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
  },
});
