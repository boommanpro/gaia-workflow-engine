/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { FlowNodeBaseType } from '../../typings';
import { FlowNodeEntity } from '../../entities';
import { FlowGroupController } from './flow-group-controller';

export namespace FlowGroupUtils {
  /** 找到节点所有上级 */
  const findNodeParents = (node: FlowNodeEntity): FlowNodeEntity[] => {
    const parents = [];
    let parent = node.parent;
    while (parent) {
      parents.push(parent);
      parent = parent.parent;
    }
    return parents;
  };

  /** 节点是否处于分组中 */
  const isNodeInGroup = (node: FlowNodeEntity): boolean => {
    // 处于分组中
    if (node?.parent?.flowNodeType === FlowNodeBaseType.GROUP) {
      return true;
    }
    return false;
  };

  /** 判断节点能否组成分组 */
  export const validate = (nodes: FlowNodeEntity[]): boolean => {
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

    // 判断节点索引是否连续
    const indexes = nodes.map((node) => node.index).sort((a, b) => a - b);
    const isIndexContinuous = indexes.every((index, i, arr) => {
      if (i === 0) {
        return true;
      }
      return index === arr[i - 1] + 1;
    });
    if (!isIndexContinuous) return false;

    // 判断节点父亲是否已经在分组中
    const parents = findNodeParents(nodes[0]);
    const parentsInGroup = parents.some((parent) => isNodeInGroup(parent));
    if (parentsInGroup) return false;

    // 参数正确
    return true;
  };

  /** 获取节点分组控制 */
  export const getNodeGroupController = (
    node?: FlowNodeEntity
  ): FlowGroupController | undefined => {
    if (!node) {
      return;
    }
    if (!isNodeInGroup(node)) {
      return;
    }
    const groupNode = node?.parent;
    return FlowGroupController.create(groupNode);
  };

  /** 向上递归查找分组递归控制 */
  export const getNodeRecursionGroupController = (
    node?: FlowNodeEntity
  ): FlowGroupController | undefined => {
    if (!node) {
      return;
    }
    const group = getNodeGroupController(node);
    if (group) {
      return group;
    }
    if (node.parent) {
      return getNodeRecursionGroupController(node.parent);
    }
    return;
  };

  /** 是否分组节点 */
  export const isGroupNode = (group: FlowNodeEntity): boolean =>
    group.flowNodeType === FlowNodeBaseType.GROUP;
}
