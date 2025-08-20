/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { WorkflowNodeEntity } from '@flowgram.ai/free-layout-core';
import { FlowNodeBaseType } from '@flowgram.ai/document';

export namespace WorkflowGroupUtils {
  /** 找到节点所有上级 */
  // const findNodeParents = (node: WorkflowNodeEntity): WorkflowNodeEntity[] => {
  //   const parents = [];
  //   let parent = node.parent;
  //   while (parent) {
  //     parents.push(parent);
  //     parent = parent.parent;
  //   }
  //   return parents;
  // };

  /** 节点是否处于分组中 */
  const isNodeInGroup = (node: WorkflowNodeEntity): boolean => {
    // 处于分组中
    if (node?.parent?.flowNodeType === FlowNodeBaseType.GROUP) {
      return true;
    }
    return false;
  };

  /** 是否分组节点 */
  const isGroupNode = (group: WorkflowNodeEntity): boolean =>
    group.flowNodeType === FlowNodeBaseType.GROUP;

  /** 判断节点能否组成分组 */
  export const validate = (nodes: WorkflowNodeEntity[]): boolean => {
    if (!nodes || !Array.isArray(nodes) || nodes.length === 0) {
      // 参数不合法
      return false;
    }

    // 判断是否有分组节点
    const isGroupRelatedNode = nodes.some((node) => isGroupNode(node));
    if (isGroupRelatedNode) return false;

    // 判断是否有节点已经处于分组中
    const hasGroup = nodes.some((node) => node && isNodeInGroup(node));
    if (hasGroup) return false;

    // 判断是否来自同一个父亲
    const parent = nodes[0].parent;
    const isSameParent = nodes.every((node) => node.parent === parent);
    if (!isSameParent) return false;

    // 判断节点父亲是否已经在分组中
    // const parents = findNodeParents(nodes[0]);
    // const parentsInGroup = parents.some((parent) => isNodeInGroup(parent));
    // if (parentsInGroup) return false;

    // 参数正确
    return true;
  };
}
