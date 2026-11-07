/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */
import { type FlowNodeEntity } from '@flowgram.ai/free-layout-editor';

import { getNodeVisual } from '../../nodes/node-visuals';

/** 节点头图标：分类色芯片 + 线性 SVG（单源 nodes/node-visuals，替代 img 位图） */
export const getIcon = (node: FlowNodeEntity) => {
  const { Icon, category } = getNodeVisual(node.flowNodeType);
  return (
    <span className="gaia-node-chip" style={{ color: `var(--g-nodecat-${category})` }}>
      <Icon size={15} />
    </span>
  );
};

/** 节点头副标题：一行摘要（模型名 / host / 分支数…），无则不显示 */
export const getSubtitle = (node: FlowNodeEntity): string | undefined => {
  try {
    return getNodeVisual(node.flowNodeType).subtitle?.(node);
  } catch {
    return undefined;
  }
};
