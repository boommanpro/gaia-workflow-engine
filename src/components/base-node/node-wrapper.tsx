import React, { useState, useContext } from 'react';

import { WorkflowPortRender } from '@flowgram.ai/free-layout-editor';

import { useNodeRenderContext } from '../../hooks';
import { SidebarContext } from '../../context';
// import { scrollToView } from './utils'
// import { useClientContext } from '@flowgram.ai/free-layout-editor';

export interface NodeWrapperProps {
  children: React.ReactNode;
}

/**
 * Used for drag-and-drop/click events and ports rendering of nodes
 * 用于节点的拖拽/点击事件和点位渲染
 */
export const NodeWrapper: React.FC<NodeWrapperProps> = (props) => {
  const nodeRender = useNodeRenderContext();
  const { selected, startDrag, ports, selectNode, nodeRef, onFocus, onBlur } = nodeRender;
  const [isDragging, setIsDragging] = useState(false);
  const sidebar = useContext(SidebarContext);
  // const ctx = useClientContext()

  return (
    <>
      <div
        ref={nodeRef}
        draggable
        onDragStart={(e) => {
          startDrag(e);
          setIsDragging(true);
        }}
        onClick={(e) => {
          selectNode(e);
          if (!isDragging) {
            sidebar.setNodeRender(nodeRender);
            // 可选：如果需要让节点滚动到画布中间加上这个
            // Optional: Add this if you want the node to scroll to the middle of the canvas
            // scrollToView(ctx, nodeRender.node)
          }
        }}
        onMouseUp={() => setIsDragging(false)}
        onFocus={onFocus}
        onBlur={onBlur}
        data-node-selected={String(selected)}
      >
        {props.children}
      </div>
      {ports.map((p) => (
        <WorkflowPortRender key={p.id} entity={p} />
      ))}
    </>
  );
};
