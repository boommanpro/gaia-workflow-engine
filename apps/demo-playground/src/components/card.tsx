/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import React, { useCallback, useState } from 'react';

import { usePlayground, usePlaygroundDrag } from '@flowgram.ai/playground-react';

export function StaticCard() {
  return (
    <div
      style={{
        width: 200,
        height: 100,
        position: 'absolute',
        color: 'white',
        backgroundColor: 'gray',
        left: 200,
        top: 200,
        alignItems: 'center',
        justifyContent: 'center',
        display: 'flex',
      }}
    >
      {' '}
      Static Card
    </div>
  );
}

export function DragableCard() {
  const [pos, setPos] = useState({ x: 100, y: 50 });
  // Used for dragging, the canvas will automatically scroll when dragged to the edge
  // 用于拖拽，拖拽到边缘时候会自动滚动画布
  const dragger = usePlaygroundDrag();
  const playground = usePlayground();
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      const startPos = { x: pos.x, y: pos.y };
      dragger.start(e, {
        // start Drag
        onDragStart() {
          playground.config.grabDisable = true;
        },
        onDrag(dragEvent) {
          setPos({
            x: startPos.x + (dragEvent.endPos.x - dragEvent.startPos.x) / dragEvent.scale,
            y: startPos.y + (dragEvent.endPos.y - dragEvent.startPos.y) / dragEvent.scale,
          });
        },
        // end drag
        onDragEnd() {
          playground.config.grabDisable = false;
        },
      });
      // e.stopPropagation();
      // e.preventDefault();
    },
    [pos]
  );
  return (
    <div
      onMouseDown={handleMouseDown}
      style={{
        cursor: 'move',
        width: 200,
        height: 100,
        position: 'absolute',
        color: 'white',
        backgroundColor: '#0089ff',
        left: pos.x,
        top: pos.y,
        alignItems: 'center',
        justifyContent: 'center',
        display: 'flex',
      }}
    >
      {' '}
      Draggable Card
    </div>
  );
}
