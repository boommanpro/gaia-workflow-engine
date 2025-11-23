/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import type {WorkflowJSON, WorkflowNodeJSON} from '@flowgram.ai/free-layout-editor';

import {traverse, TraverseContext} from './traverse';
import {generateValidId} from "@/nodes/utils";

namespace UniqueWorkflowUtils {
  /** generate unique id - 生成唯一ID */

  /** generate unique id with prefix - 生成带前缀的唯一ID */
  const generateUniqueIdWithPrefix = (originalId: string): string => {
    // 提取原始ID的前缀部分（第一个下划线之前的部分）
    const prefixMatch = originalId.match(/^([^_]+)/);
    const prefix = prefixMatch ? prefixMatch[1] : 'node';
    // 生成随机数字后缀
    return generateValidId(`${prefix}`);
  };

  /** get all node ids from workflow json - 从工作流JSON中获取所有节点ID */
  export const getAllNodeIds = (json: WorkflowJSON): string[] => {
    const nodeIds = new Set<string>(); // use set to store unique ids - 使用Set存储唯一ID
    const addNodeId = (node: WorkflowNodeJSON) => {
      nodeIds.add(node.id);
      if (node.blocks?.length) {
        node.blocks.forEach((child) => addNodeId(child)); // recursively add child node ids - 递归添加子节点ID
      }
    };
    json.nodes.forEach((node) => addNodeId(node));
    return Array.from(nodeIds);
  };

  /** generate node replacement mapping - 生成节点替换映射 */
  export const generateNodeReplaceMap = (
    nodeIds: string[],
    isUniqueId: (id: string) => boolean
  ): Map<string, string> => {
    const nodeReplaceMap = new Map<string, string>(); // create map for id replacement - 创建ID替换映射
    nodeIds.forEach((originalId) => {
      if (isUniqueId(originalId)) {
        nodeReplaceMap.set(originalId, originalId); // keep original id if unique - 如果ID唯一则保持不变
      } else {
        let newId: string;
        do {
          newId = generateUniqueIdWithPrefix(originalId); // generate new id with prefix until unique - 生成带前缀的新ID直到唯一
        } while (!isUniqueId(newId));
        nodeReplaceMap.set(originalId, newId);
      }
    });
    return nodeReplaceMap;
  };

  /** check if value exists - 检查值是否存在 */
  const isExist = (value: unknown): boolean => value !== null && value !== undefined;

  /** check if node should be handled - 检查节点是否需要处理 */
  const shouldHandle = (context: TraverseContext): boolean => {
    const { node } = context;
    // check edge data - 检查边数据
    if (
      node?.key &&
      ['sourceNodeID', 'targetNodeID'].includes(node.key) &&
      node.parent?.parent?.key === 'edges'
    ) {
      return true;
    }
    // check node data - 检查节点数据
    if (
      node?.key === 'id' &&
      isExist(node.container?.type) &&
      isExist(node.container?.meta) &&
      isExist(node.container?.data)
    ) {
      return true;
    }
    // check variable data - 检查变量数据
    if (
      node?.key === 'blockID' &&
      isExist(node.container?.name) &&
      node.container?.source === 'block-output'
    ) {
      return true;
    }
    return false;
  };

  /**
   * replace node ids in workflow json - 替换工作流JSON中的节点ID
   * notice: this method has side effects, it will modify the input json to avoid deep copy overhead
   * - 注意：此方法有副作用，会修改输入的json以避免深拷贝开销
   */
  export const replaceNodeId = (
    json: WorkflowJSON,
    nodeReplaceMap: Map<string, string>
  ): WorkflowJSON => {
    traverse(json, (context) => {
      if (!shouldHandle(context)) {
        return;
      }
      const { node } = context;
      if (nodeReplaceMap.has(node.value)) {
        context.setValue(nodeReplaceMap.get(node.value)); // replace old id with new id - 用新ID替换旧ID
      }
    });
    return json;
  };
}

/** generate unique workflow json - 生成唯一工作流JSON */
export const generateUniqueWorkflow = (params: {
  json: WorkflowJSON;
  isUniqueId: (id: string) => boolean;
}): WorkflowJSON => {
  const { json, isUniqueId } = params;
  const nodeIds = UniqueWorkflowUtils.getAllNodeIds(json); // get all existing node ids - 获取所有现有节点ID
  const nodeReplaceMap = UniqueWorkflowUtils.generateNodeReplaceMap(nodeIds, isUniqueId); // generate id replacement map - 生成ID替换映射
  return UniqueWorkflowUtils.replaceNodeId(json, nodeReplaceMap); // replace all node ids - 替换所有节点ID
};
