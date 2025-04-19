// sidebar-renderer.tsx
import Draggable from 'react-draggable';
import React, { useCallback, useContext, useEffect } from 'react';

import {
  PlaygroundEntityContext,
  useClientContext,
  useRefresh,
} from '@flowgram.ai/free-layout-editor';
import { SideSheet } from '@douyinfe/semi-ui';

import RunNodeSidebar from '../run-node-sidebar';
import { IsSidebarContext, NodeRenderContext, SidebarContext } from '../../context';
import {
  draggableContainerStyle,
  draggableHandleInnerStyle,
  draggableHandleStyle,
  NodeContent,
} from './styles.tsx';

export const SidebarRenderer = () => {
  const { nodeRender, setNodeRender } = useContext(SidebarContext);
  const { selection, playground } = useClientContext();
  const refresh = useRefresh();
  const handleClose = useCallback(() => {
    setNodeRender(undefined);
  }, []);

  useEffect(() => {
    const disposable = playground.config.onReadonlyOrDisabledChange(() => refresh());
    return () => disposable.dispose();
  }, [playground]);

  useEffect(() => {
    const toDispose = selection.onSelectionChanged(() => {
      if (selection.selection.length === 0) {
        handleClose();
      } else if (selection.selection.length === 1 && selection.selection[0] !== nodeRender?.node) {
        handleClose();
      }
    });
    return () => toDispose.dispose();
  }, [selection, handleClose]);

  useEffect(() => {
    if (nodeRender) {
      const toDispose = nodeRender.node.onDispose(() => {
        setNodeRender(undefined);
      });
      return () => toDispose.dispose();
    }
    return () => {};
  }, [nodeRender]);

  if (playground.config.readonly) {
    return null;
  }

  if (selection.selection.length == 1 && selection.selection[0]._metaCache?.hiddenSidebar) {
    return null;
  }

  const content = nodeRender ? (
    <PlaygroundEntityContext.Provider key={nodeRender.node.id} value={nodeRender.node}>
      <NodeRenderContext.Provider value={nodeRender}>
        {nodeRender.form?.render()}
      </NodeRenderContext.Provider>
    </PlaygroundEntityContext.Provider>
  ) : null;

  return (
    <SideSheet
      style={{ position: 'relative', height: '100%' }}
      mask={false}
      visible={!!nodeRender}
      onCancel={handleClose}
    >
      <NodeContent style={{ position: 'relative', height: `100%` }}>
        <IsSidebarContext.Provider value={true}>{content}</IsSidebarContext.Provider>
      </NodeContent>

      <Draggable bounds={{ top: -200, bottom: 200 }} axis="y">
        <div style={draggableContainerStyle}>
          <div style={draggableHandleStyle}>
            <div style={draggableHandleInnerStyle} />
          </div>

          <RunNodeSidebar />
        </div>
      </Draggable>
    </SideSheet>
  );
};
