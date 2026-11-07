/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import React, { useState } from 'react';

import { usePanelManager } from '@flowgram.ai/panel-manager-plugin';
import { WorkflowPortRender } from '@flowgram.ai/free-layout-editor';
import { useClientContext } from '@flowgram.ai/free-layout-editor';
import { Tooltip } from '@douyinfe/semi-ui';

import { FlowNodeMeta } from '../../typings';
import { useNodeRenderContext, usePortClick } from '../../hooks';
import { getSubtitle } from '../../form-components/form-header/utils';
import { scrollToView } from './utils';
import { NodeWrapperStyle } from './styles';
import { nodeFormPanelFactory } from '../sidebar';

export interface NodeWrapperProps {
  isScrollToView?: boolean;
  children: React.ReactNode;
  /** 紧凑密度：胶囊形态 + 双击临时展开 + 抑制端口「+」创建 */
  compact?: boolean;
  onToggleCompact?: () => void;
}

/**
 * Used for drag-and-drop/click events and ports rendering of nodes
 * 用于节点的拖拽/点击事件和点位渲染
 */
export const NodeWrapper: React.FC<NodeWrapperProps> = (props) => {
  const { children, isScrollToView = false, compact = false, onToggleCompact } = props;
  const nodeRender = useNodeRenderContext();
  const { node, selected, startDrag, ports, selectNode, nodeRef, onFocus, onBlur, readonly } =
    nodeRender;
  const [isDragging, setIsDragging] = useState(false);
  const form = nodeRender.form;
  const ctx = useClientContext();
  const onPortClick = usePortClick();
  const meta = node.getNodeMeta<FlowNodeMeta>();

  const panelManager = usePanelManager();

  const portsRender = ports.map((p) => (
    <WorkflowPortRender
      key={p.id}
      entity={p}
      // 紧凑密度下隐藏端口「+」创建（加节点走左侧面板/右键，设计稿 2026-11-06 已确认）
      onClick={!readonly && !compact ? onPortClick : undefined}
    />
  ));

  const wrapper = (
    <NodeWrapperStyle
      className={selected ? (compact ? 'selected compact' : 'selected') : compact ? 'compact' : ''}
      ref={nodeRef}
      draggable
      onDragStart={(e) => {
        startDrag(e);
        setIsDragging(true);
      }}
      onTouchStart={(e) => {
        startDrag(e as unknown as React.MouseEvent);
        setIsDragging(true);
      }}
      onClick={(e) => {
        selectNode(e);
        if (!isDragging) {
          panelManager.open(nodeFormPanelFactory.key, 'right', {
            props: {
              nodeId: nodeRender.node.id,
            },
          });
          // 可选：将 isScrollToView 设为 true，可以让节点选中后滚动到画布中间
          // Optional: Set isScrollToView to true to scroll the node to the center of the canvas after the node is selected.
          if (isScrollToView) {
            scrollToView(ctx, nodeRender.node);
          }
        }
      }}
      onDoubleClick={compact ? onToggleCompact : undefined}
      onMouseUp={() => setIsDragging(false)}
      onFocus={onFocus}
      onBlur={onBlur}
      data-node-selected={String(selected)}
      data-node-compact={String(compact)}
      style={{
        ...meta.wrapperStyle,
        outline: form?.state.invalid ? '1px solid red' : 'none',
      }}
    >
      {children}
    </NodeWrapperStyle>
  );

  // 紧凑胶囊：悬停 0.5s 显示「标题 + 副标题 + 双击展开」摘要（Dify/n8n 悬停延迟口径）
  const title: string = form?.values?.title || node.flowNodeType;
  const subtitle = getSubtitle(node);
  const wrapped =
    compact && !readonly ? (
      <Tooltip
        content={
          <div>
            <div>{title}</div>
            {subtitle && <div style={{ opacity: 0.65 }}>{subtitle}</div>}
          </div>
        }
        position="top"
        mouseEnterDelay={0.5}
        showArrow
      >
        {wrapper}
      </Tooltip>
    ) : (
      wrapper
    );

  return (
    <>
      {wrapped}
      {portsRender}
    </>
  );
};
