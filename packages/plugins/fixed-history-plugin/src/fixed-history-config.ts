/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { injectable } from 'inversify';
import { FlowNodeEntity } from '@flowgram.ai/document';
import { FlowNodeJSON } from '@flowgram.ai/document';
import { PluginContext } from '@flowgram.ai/core';

import {
  FixedHistoryPluginOptions,
  GetBlockLabel,
  GetNodeLabel,
  GetNodeLabelById,
  GetNodeURI,
  NodeToJson,
} from './types';

@injectable()
export class FixedHistoryConfig {
  init(ctx: PluginContext, options: FixedHistoryPluginOptions) {
    if (options.nodeToJSON) {
      this.nodeToJSON = options.nodeToJSON(ctx);
    }

    if (options.getNodeLabelById) {
      this.getNodeLabelById = options.getNodeLabelById(ctx);
    }

    if (options.getNodeLabel) {
      this.getNodeLabel = options.getNodeLabel(ctx);
    }

    if (options.getBlockLabel) {
      this.getBlockLabel = options.getBlockLabel(ctx);
    }

    if (options.getNodeURI) {
      this.getNodeURI = options.getNodeURI(ctx);
    }
  }

  nodeToJSON: NodeToJson = (node: FlowNodeEntity) => node.toJSON();

  getNodeLabelById: GetNodeLabelById = (id: string) => id;

  getNodeLabel: GetNodeLabel = (node: FlowNodeJSON) => node.id;

  getBlockLabel: GetBlockLabel = (node: FlowNodeJSON) => node.id;

  getNodeURI: GetNodeURI = (id: string) => `node:${id}`;

  getParentName(parentId?: string) {
    return parentId ? this.getNodeLabelById(parentId) : 'root';
  }
}
