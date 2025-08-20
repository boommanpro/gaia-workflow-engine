import { useCallback, useContext, useEffect, useMemo } from 'react';

import { Drawer } from 'antd';
import {
  PlaygroundEntityContext,
  useClientContext,
  useRefresh,
} from '@flowgram.ai/free-layout-editor';

import { FlowNodeMeta } from '@editor/typings';
import { IsSidebarContext, SidebarContext } from '@editor/context';
import { SidebarNodeRenderer } from './sidebar-node-renderer';

export const SidebarRenderer = () => {
  const { nodeId, setNodeId } = useContext(SidebarContext);
  const { selection, playground, document } = useClientContext();
  const refresh = useRefresh();
  const handleClose = useCallback(() => {
    setNodeId(undefined);
  }, []);
  const node = nodeId ? document.getNode(nodeId) : undefined;
  /**
   * Listen readonly
   */
  useEffect(() => {
    const disposable = playground.config.onReadonlyOrDisabledChange(() => {
      handleClose();
      refresh();
    });
    return () => disposable.dispose();
  }, [playground]);
  /**
   * Listen selection
   */
  useEffect(() => {
    const toDispose = selection.onSelectionChanged(() => {
      /**
       * 如果没有选中任何节点，则自动关闭侧边栏
       * If no node is selected, the sidebar is automatically closed
       */
      if (selection.selection.length === 0) {
        handleClose();
      } else if (selection.selection.length === 1 && selection.selection[0] !== node) {
        handleClose();
      }
    });
    return () => toDispose.dispose();
  }, [selection, handleClose, node]);
  /**
   * Close when node disposed
   */
  useEffect(() => {
    if (node) {
      const toDispose = node.onDispose(() => {
        setNodeId(undefined);
      });
      return () => toDispose.dispose();
    }
    return () => {};
  }, [node]);

  const visible = useMemo(() => {
    if (!node) {
      return false;
    }
    const { sidebarDisable = false } = node.getNodeMeta<FlowNodeMeta>();
    return !sidebarDisable;
  }, [node]);

  if (playground.config.readonly) {
    return null;
  }
  /**
   * Add "key" to rerender the sidebar when the node changes
   */
  const content =
    node && visible ? (
      <PlaygroundEntityContext.Provider key={node.id} value={node}>
        <SidebarNodeRenderer node={node} />
      </PlaygroundEntityContext.Provider>
    ) : null;

  return (
    <Drawer mask={false} open={visible} onClose={handleClose}>
      <IsSidebarContext.Provider value={true}>{content}</IsSidebarContext.Provider>
    </Drawer>
  );
};
