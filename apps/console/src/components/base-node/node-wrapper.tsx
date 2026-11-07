/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import React, { useState } from 'react';

import { usePanelManager } from '@flowgram.ai/panel-manager-plugin';
import { WorkflowPortRender } from '@flowgram.ai/free-layout-editor';
import { useClientContext } from '@flowgram.ai/free-layout-editor';
import { Tooltip } from '@douyinfe/semi-ui';

import { useNodeReport } from '../testrun/node-status-bar';
import { FlowNodeMeta } from '../../typings';
import { useNodeRenderContext, usePortClick } from '../../hooks';
import { getSubtitle } from '../../form-components/form-header/utils';
import { scrollToView } from './utils';
import { NodeWrapperStyle } from './styles';
import { nodeFormPanelFactory } from '../sidebar';
import { t } from '../../i18n';

export interface NodeWrapperProps {
  isScrollToView?: boolean;
  children: React.ReactNode;
  /** 紧凑密度：n8n 方卡 + 双击展开 + 抑制端口「+」创建 */
  compact?: boolean;
  /** 收起/展开切换（节点级，node-compact-store；非专家编辑器画布为 undefined） */
  onToggleCompact?: () => void;
}

/** 收起按钮已移至卡片头 FormHeader（2026-11-07 固定入口）；本组件只保留紧凑态交互 */

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
  const report = useNodeReport();

  const panelManager = usePanelManager();

  // 紧凑态试运行光环：.st-processing/.st-succeeded/.st-failed（色环见 styles.tsx，口径同 statusDotColor）
  const statusClass = compact && report ? ` st-${String(report.status).toLowerCase()}` : '';

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
      className={`${selected ? 'selected' : ''} ${compact ? 'compact' : ''}${statusClass}`.trim()}
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
      onDoubleClick={compact && onToggleCompact ? onToggleCompact : undefined}
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

  // 紧凑方卡：悬停 0.5s 显示「标题 + 副标题 + 双击展开」摘要（Coze/n8n 悬停延迟口径）
  const title: string = form?.values?.title || node.flowNodeType;
  const subtitle = getSubtitle(node);
  const wrapped =
    compact && !readonly ? (
      <Tooltip
        content={
          <div>
            <div>{title}</div>
            <div style={{ opacity: 0.65 }}>
              {subtitle ? `${subtitle} · ` : ''}
              {t('nodeCompact.dblclickHint')}
            </div>
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
