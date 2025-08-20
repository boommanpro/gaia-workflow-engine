/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import {
  WorkflowContentChangeType,
  WorkflowDocument,
  WorkflowDocumentOptionsDefault,
} from '@flowgram.ai/free-layout-core';
import {
  FlowNodeBaseType,
  FlowNodeEntity,
  FlowNodeFormData,
  type FlowNodeJSON,
} from '@flowgram.ai/editor';

import { FreeLayoutProps } from './free-layout-props';

export function fromNodeJSON(
  opts: FreeLayoutProps,
  node: FlowNodeEntity,
  json: FlowNodeJSON,
  isFirstCreate: boolean
) {
  json = opts.fromNodeJSON ? opts.fromNodeJSON(node, json, isFirstCreate) : json;
  const formData = node.getData(FlowNodeFormData)!;
  // 如果没有使用表单引擎，将 data 数据填入 extInfo
  if (!formData) {
    if (json.data) {
      node.updateExtInfo(json.data);
    }
    // extInfo 数据更新则触发内容更新
    if (isFirstCreate) {
      node.onExtInfoChange(() => {
        (node.document as WorkflowDocument).fireContentChange({
          type: WorkflowContentChangeType.NODE_DATA_CHANGE,
          toJSON: () => node.getExtInfo(),
          entity: node,
        });
      });
    }
    return;
  }

  return WorkflowDocumentOptionsDefault.fromNodeJSON!(node, json, isFirstCreate);
}

export function toNodeJSON(opts: FreeLayoutProps, node: FlowNodeEntity): FlowNodeJSON {
  const formData = node.getData(FlowNodeFormData)!;
  const position = node.transform.position;
  let json: FlowNodeJSON;
  // 不使用节点引擎则采用 extInfo
  if (!formData) {
    json = {
      id: node.id,
      type: node.flowNodeType,
      meta: {
        position: { x: position.x, y: position.y },
      },
      data: node.getExtInfo(),
    };
  } else {
    json = WorkflowDocumentOptionsDefault.toNodeJSON!(node);
  }
  // 处理分组节点
  if (node.flowNodeType === FlowNodeBaseType.GROUP) {
    const parentID = node.parent?.id ?? FlowNodeBaseType.ROOT;
    const blockIDs = node.blocks.map((block) => block.id) ?? [];
    json.data = {
      ...json.data,
      parentID,
      blockIDs,
    };
  }
  return opts.toNodeJSON ? opts.toNodeJSON(node, json) : json;
}
