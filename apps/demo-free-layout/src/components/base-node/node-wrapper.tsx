import React, { useContext, useState } from 'react';

import { WorkflowPortRender } from '@flowgram.ai/free-layout-editor';

import { useNodeRenderContext } from '../../hooks';
import { PanelEnum, useSidebarContext } from '../../context';
import { NodeWrapperStyle } from './styles.tsx';
// import { scrollToView } from './utils'
// import { useClientContext } from '@flowgram.ai/free-layout-editor';

export interface NodeWrapperProps {
  isScrollToView?: boolean;
  children: React.ReactNode;
}
/**
 * Used for drag-and-drop/click events and ports rendering of nodes
 * 用于节点的拖拽/点击事件和点位渲染
 */
export const NodeWrapper: React.FC<NodeWrapperProps> = (props) => {
  const { children, isScrollToView = false } = props;
  const nodeRender = useNodeRenderContext();
  const { selected, startDrag, ports, selectNode, nodeRef, onFocus, onBlur } = nodeRender;
  const [isDragging, setIsDragging] = useState(false);
  const sidebar = useSidebarContext();
  // const ctx = useClientContext()
    const form = nodeRender.form;
  const portsRender = ports.map((p) => <WorkflowPortRender key={p.id} entity={p} />);

  return (
    <>
      <NodeWrapperStyle
        ref={nodeRef}
        draggable
        onDragStart={(e) => {
          startDrag(e);
          setIsDragging(true);
        }}
        onClick={(e) => {
          selectNode(e);
          if (!isDragging) {
            sidebar.updatePanelValue(PanelEnum.NodeEdit, {
              isRunning: true,
              nodeRender,
            });
            // 可选：如果需要让节点滚动到画布中间加上这个
            // Optional: Add this if you want the node to scroll to the middle of the canvas
            // scrollToView(ctx, nodeRender.node)
          }
        }}
        onMouseUp={() => setIsDragging(false)}
        onFocus={onFocus}
        onBlur={onBlur}
        data-node-selected={String(selected)}
        style={{
          outline: form?.state.invalid ? '1px solid red' : 'none',
        }}
      >
        {children}
      </NodeWrapperStyle>
      {portsRender}
    </>
  );
};
