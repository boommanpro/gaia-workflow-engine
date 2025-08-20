/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { FormModelV2 } from '@flowgram.ai/node';
import {
  createNodeContainerModules,
  createNodeEntityDatas,
  FlowNodeFormData,
  FormManager,
  NodeManager,
} from '@flowgram.ai/form-core';
import { FlowDocument, FlowNodeEntity } from '@flowgram.ai/document';
import { definePluginCreator, EntityManager } from '@flowgram.ai/core';

import { registerNodeMaterial } from './utils';
import { NodeEngineMaterialOptions } from './types';

export interface NodeCorePluginOptions {
  materials?: NodeEngineMaterialOptions;
}

export const createNodeCorePlugin = definePluginCreator<NodeCorePluginOptions>({
  onInit(ctx, options) {
    /**
     * 注册NodeEngine 相关 EntityData 到flowDocument
     */
    ctx.get<FlowDocument>(FlowDocument).registerNodeDatas(...createNodeEntityDatas());

    const formModelFactory = (entity: FlowNodeEntity) => new FormModelV2(entity);
    const entityManager = ctx.get<EntityManager>(EntityManager);
    entityManager.registerEntityData(
      FlowNodeFormData,
      () =>
        ({
          formModelFactory: formModelFactory,
        } as any)
    );

    if (!options.materials) {
      return;
    }

    const nodeManager = ctx.get<NodeManager>(NodeManager);
    const formManager = ctx.get<FormManager>(FormManager);

    if (!nodeManager || !formManager) {
      throw new Error('NodeCorePlugin Error: nodeManager or formManager not found');
    }

    registerNodeMaterial({ nodeManager, formManager, material: options.materials! });
  },
  onDispose(ctx) {
    ctx.get<FormManager>(FormManager)?.dispose();
  },
  containerModules: createNodeContainerModules(),
  // onBind: ({ bind }) => {
  //   bindContributions(bind, FormNodeContribution, [NodeContribution]);
  // },
});
