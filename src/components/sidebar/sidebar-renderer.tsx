// sidebar-renderer.tsx
import React, { useCallback, useContext, useEffect } from 'react';

import {
  PlaygroundEntityContext,
  useClientContext,
  useRefresh,
} from '@flowgram.ai/free-layout-editor';
import { SideSheet } from '@douyinfe/semi-ui';

import { IsSidebarContext, NodeRenderContext, PanelEnum, SidebarContext } from '../../context';
import { NodeContent } from './styles.tsx';

export const SidebarRenderer = () => {
  const { selection, playground } = useClientContext();
  const refresh = useRefresh();
  const { updatePanelValue, getFirstEnablePanel } = useContext(SidebarContext);

  const handleClose = useCallback(() => {
    console.log('handleClose');
    let key = getFirstEnablePanel();
    if (key) {
      updatePanelValue(key.key, {
        ...key.value,
        isRunning: false,
      });
    }
  }, []);
  useEffect(() => {
    const disposable = playground.config.onReadonlyOrDisabledChange(() => refresh());
    return () => disposable.dispose();
  }, [playground]);

  useEffect(() => {
    const toDispose = selection.onSelectionChanged(() => {
      if (selection.selection.length === 0) {
        handleClose();
      } else if (selection.selection.length === 1) {
        // handleClose();
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
  console.log(firstEnablePanel);
  if (!firstEnablePanel) {
    return null;
  }
  const content =
    firstEnablePanel?.key == PanelEnum.NodeEdit ? (
      <PlaygroundEntityContext.Provider
        key={firstEnablePanel.value.nodeRender.node.id}
        value={firstEnablePanel.value.nodeRender.node}
      >
        <NodeRenderContext.Provider value={firstEnablePanel.value.nodeRender}>
          {firstEnablePanel.value.nodeRender.form?.render()}
        </NodeRenderContext.Provider>
        {/*<RunNodeSidebar />*/}
      </PlaygroundEntityContext.Provider>
    ) : null;

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
