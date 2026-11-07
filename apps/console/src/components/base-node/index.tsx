/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { useCallback, useState } from 'react';

import { FlowNodeEntity, useClientContext, useNodeRender } from '@flowgram.ai/free-layout-editor';
import { ConfigProvider } from '@douyinfe/semi-ui';

import { NodeStatusBar } from '../testrun/node-status-bar';
import { CompactNodeCard } from '../compact-node';
import { useEditorPrefs } from '../../editor-prefs';
import { NodeRenderContext } from '../../context';
import { ErrorIcon } from './styles';
import { NodeWrapper } from './node-wrapper';

export const BaseNode = ({ node }: { node: FlowNodeEntity }) => {
  /**
   * Provides methods related to node rendering
   * 提供节点渲染相关的方法
   */
  const nodeRender = useNodeRender();
  const ctx = useClientContext();
  const prefs = useEditorPrefs();

  /**
   * 紧凑密度（docs/node-compact-mode-redesign-2026-11-06.md 方案 A）：
   * 独立渲染分支渲染胶囊卡（CompactNodeCard），不再经 CSS 硬压表单。
   * 容器节点（loop 等有子块）不参与紧凑；双击胶囊可临时展开单个节点。
   */
  const isContainer = Boolean(node.getNodeMeta().isContainer);
  const compactable = prefs.compact && !isContainer;
  const [expandedOverride, setExpandedOverride] = useState(false);
  const compact = compactable && !expandedOverride;
  const toggleCompact = useCallback(() => {
    if (compactable) {
      setExpandedOverride((v) => !v);
    }
  }, [compactable]);

  /**
   * It can only be used when nodeEngine is enabled
   * 只有在节点引擎开启时候才能使用表单
   */
  const form = nodeRender.form;

  /**
   * Used to make the Tooltip scale with the node, which can be implemented by itself depending on the UI library
   * 用于让 Tooltip 跟随节点缩放, 这个可以根据不同的 ui 库自己实现
   */
  const getPopupContainer = useCallback(
    () => ctx.playground.node.querySelector('.gedit-flow-render-layer') as HTMLDivElement,
    []
  );

  return (
    <ConfigProvider getPopupContainer={getPopupContainer}>
      <NodeRenderContext.Provider value={nodeRender}>
        <NodeWrapper compact={compact} onToggleCompact={toggleCompact}>
          {form?.state.invalid && <ErrorIcon />}
          {compact ? <CompactNodeCard /> : form?.render()}
        </NodeWrapper>
        {!compact && <NodeStatusBar />}
      </NodeRenderContext.Provider>
    </ConfigProvider>
  );
};
