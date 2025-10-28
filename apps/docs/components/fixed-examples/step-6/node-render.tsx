/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import '@flowgram.ai/fixed-layout-editor/index.css';

import { FlowNodeEntity, useNodeRender, useClientContext } from '@flowgram.ai/fixed-layout-editor';

export const NodeRender = ({ node }: { node: FlowNodeEntity }) => {
  const {
    onMouseEnter,
    onMouseLeave,
    startDrag,
    form,
    dragging,
    isBlockOrderIcon,
    isBlockIcon,
    activated,
  } = useNodeRender();
  const ctx = useClientContext();

  return (
    <div
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onMouseDown={(e) => {
        startDrag(e);
        e.stopPropagation();
      }}
      style={{
        width: 280,
        minHeight: 88,
        height: 'auto',
        background: '#fff',
        border: '1px solid rgba(6, 7, 9, 0.15)',
        borderColor: activated ? '#82a7fc' : 'rgba(6, 7, 9, 0.15)',
        borderRadius: 8,
        boxShadow: '0 2px 6px 0 rgba(0, 0, 0, 0.04), 0 4px 12px 0 rgba(0, 0, 0, 0.02)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        position: 'relative',
        padding: 12,
        cursor: 'move',
        opacity: dragging ? 0.3 : 1,
        ...(isBlockOrderIcon || isBlockIcon ? { width: 260 } : {}),
      }}
    >
      {form?.render()}
      {/* 删除按钮 */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          ctx.operation.deleteNode(node);
        }}
        style={{
          position: 'absolute',
          top: 4,
          right: 4,
          width: 20,
          height: 20,
          border: 'none',
          borderRadius: '50%',
          background: '#fff',
          color: '#666',
          fontSize: 12,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
          transition: 'all 0.2s',
        }}
      >
        ×
      </button>
    </div>
  );
};
