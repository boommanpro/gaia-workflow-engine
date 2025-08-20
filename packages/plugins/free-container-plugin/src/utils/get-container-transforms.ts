/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { WorkflowNodeEntity } from '@flowgram.ai/free-layout-core';
import { FlowNodeTransformData } from '@flowgram.ai/document';

import { isContainer } from './is-container';

/** 获取容器节点transforms */
export const getContainerTransforms = (allNodes: WorkflowNodeEntity[]): FlowNodeTransformData[] =>
  allNodes
    .filter((node) => {
      if (node.originParent) {
        return node.getNodeMeta().selectable && node.originParent.getNodeMeta().selectable;
      }
      return node.getNodeMeta().selectable;
    })
    .filter((node) => isContainer(node))
    .sort((a, b) => {
      const aIndex = a.renderData.stackIndex;
      const bIndex = b.renderData.stackIndex;
      //  确保层级高的节点在前面
      return bIndex - aIndex;
    })
    .map((node) => node.transform);
