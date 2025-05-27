// sidebar-renderer.tsx
import React, { useCallback, useEffect } from 'react';

import {
  PlaygroundEntityContext,
  useClientContext,
  useRefresh,
} from '@flowgram.ai/free-layout-editor';
import { SideSheet } from '@douyinfe/semi-ui';

import { IsSidebarContext, NodeRenderContext, PanelEnum, useSidebarContext } from '../../context';
import { NodeContent } from './styles.tsx';
import RunWorkflowSidebar from '../run-workflow-panel';
import RunNodeSidebar from '../run-node-panel';

export const SidebarRenderer = () => {
  const { selection, playground } = useClientContext();
  const refresh = useRefresh();
  const { updatePanelValue, getFirstEnablePanel } = useSidebarContext();

  const handleClose = useCallback(() => {
    let key = getFirstEnablePanel();
    console.log(key);
    if (key) {
      updatePanelValue(key.key, {
        ...key.value,
        isRunning: false,
      });
    }
  }, [getFirstEnablePanel, updatePanelValue]);
  useEffect(() => {
    const disposable = playground.config.onReadonlyOrDisabledChange(() => refresh());
    return () => disposable.dispose();
  }, [playground]);

  useEffect(() => {
    let firstEnablePanel = getFirstEnablePanel();
    const toDispose = selection.onSelectionChanged(() => {
      if (selection.selection.length === 0) {
        handleClose();
      } else if (selection.selection.length === 1 && !firstEnablePanel) {
        handleClose();
      }
    });
    return () => toDispose.dispose();
  }, [selection, handleClose]);

  if (playground.config.readonly) {
    return null;
  }

  if (selection.selection.length == 1 && selection.selection[0]._metaCache?.hiddenSidebar) {
    return null;
  }

  let firstEnablePanel = getFirstEnablePanel();
  if (!firstEnablePanel) {
    return null;
  }
  const content = (() => {
    switch (firstEnablePanel?.key) {
      case PanelEnum.NodeEdit:
        return (
          <PlaygroundEntityContext.Provider
            key={firstEnablePanel.value.nodeRender.node.id}
            value={firstEnablePanel.value.nodeRender.node}
          >
            <NodeRenderContext.Provider value={firstEnablePanel.value.nodeRender}>
              {firstEnablePanel.value.nodeRender.form?.render()}
            </NodeRenderContext.Provider>
          </PlaygroundEntityContext.Provider>
        );
      case PanelEnum.NodeRun:
        return <RunNodeSidebar />;
      // 可以继续添加其他 PanelEnum 的处理逻辑
      case PanelEnum.WorkflowRun:
        return <RunWorkflowSidebar />;
      default:
        return null;
    }
  })();

  return (
    <SideSheet
      style={{ position: 'relative', height: '100%' }}
      mask={false}
      visible={!!firstEnablePanel}
      onCancel={handleClose}
    >
      <NodeContent style={{ position: 'relative', height: `100%` }}>
        <IsSidebarContext.Provider value={true}>{content}</IsSidebarContext.Provider>
      </NodeContent>
    </SideSheet>
  );
};
