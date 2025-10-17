/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import React, { useRef, useState } from 'react';

interface Props {
  onResize: (w: number) => void;
  size: number;
  isVertical?: boolean;
}

export const ResizeBar: React.FC<Props> = ({ onResize, size, isVertical }) => {
  const currentPoint = useRef<null | number>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  return (
    <div
      onMouseDown={(e) => {
        currentPoint.current = isVertical ? e.clientX : e.clientY;
        e.stopPropagation();
        e.preventDefault();
        setIsDragging(true);
        const mouseUp = () => {
          currentPoint.current = null;
          document.body.removeEventListener('mouseup', mouseUp);
          document.body.removeEventListener('mousemove', mouseMove);
          setIsDragging(false);
        };
        const mouseMove = (e: MouseEvent) => {
          const delta = currentPoint.current! - (isVertical ? e.clientX : e.clientY);
          onResize(size + delta);
        };
        document.body.addEventListener('mouseup', mouseUp);
        document.body.addEventListener('mousemove', mouseMove);
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        zIndex: 999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'auto',
        ...(isVertical
          ? {
              cursor: 'ew-resize',
              height: '100%',
              marginLeft: -5,
              width: 10,
            }
          : {
              cursor: 'ns-resize',
              width: '100%',
              marginTop: -5,
              height: 10,
            }),
      }}
    >
      <div
        style={{
          ...(isVertical
            ? {
                width: 3,
                height: '100%',
              }
            : {
                height: 3,
                width: '100%',
              }),
          backgroundColor: isDragging || isHovered ? 'var(--g-playground-line)' : 'transparent',
        }}
      />
    </div>
  );
};
