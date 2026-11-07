/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { useCallback } from 'react';

import { FlowNodeEntity, useClientContext, useNodeRender } from '@flowgram.ai/free-layout-editor';
import { ConfigProvider } from '@douyinfe/semi-ui';

import { NodeStatusBar } from '../testrun/node-status-bar';
import { CompactNodeCard } from '../compact-node';
import { useNodeCompact } from '../../node-compact-store';
import { NodeRenderContext } from '../../context';
import { ErrorIcon } from './styles';
import { NodeWrapper } from './node-wrapper';

export const BaseNode = ({ node }: { node: FlowNodeEntity }) => {
  /**
   * 提供节点渲染相关的方法
   * 提供节点渲染相关的方法
   */
  const nodeRender = useNodeRender();
  const ctx = useClientContext();

  /**
   * 节点级紧凑密度（2026-11-07，替代全局偏好 gaia.editor.prefs.compact）：
   * 完整卡悬停/选中时上方浮出「框按钮」收起（NodeWrapper），双击紧凑卡展开；
   * 状态按工作流存 localStorage（node-compact-store），不进 DSL。
   * 容器节点（loop 等有子块）不参与紧凑；非专家编辑器画布（只读预览）不启用。
   */
  const isContainer = Boolean(node.getNodeMeta().isContainer);
  const { collapsed, toggle } = useNodeCompact(node);
  const compact = collapsed && !isContainer;

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
        <NodeWrapper compact={compact} onToggleCompact={toggle}>
          {form?.state.invalid && <ErrorIcon />}
          {compact ? <CompactNodeCard /> : form?.render()}
        </NodeWrapper>
        {!compact && <NodeStatusBar />}
      </NodeRenderContext.Provider>
    </ConfigProvider>
  );
};
