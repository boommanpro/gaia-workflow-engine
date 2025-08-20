/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { DEFAULT_SPACING } from '../typings';
import { FlowDocumentOptions } from '../flow-document-options';
import { FlowNodeEntity } from '../entities/flow-node-entity';

/**
 *
 * @param node 节点 entity
 * @param key 从 DocumentOptions 里获取 constants 的 key
 * @param defaultSpacing 默认从 DEFAULT_SPACING 获取 spacing，也可以外部传入默认值
 * @returns
 */
export const getDefaultSpacing = (node: FlowNodeEntity, key: string, defaultSpacing?: number) => {
  const flowDocumentOptions = node.getService<FlowDocumentOptions>(FlowDocumentOptions);
  const spacing = flowDocumentOptions?.constants?.[key] || defaultSpacing || DEFAULT_SPACING[key];
  return spacing;
};
