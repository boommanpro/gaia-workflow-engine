import React, { useEffect } from 'react';

import { useDraggable } from './useDraggable';
import { DragHandle } from './DragHandle';

interface ResizableProps {
  defaultHeight?: number;
  minHeight?: number;
  maxHeight?: number;
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
  onHeightChange?: (height: number) => void;
}

export const Resizable: React.FC<ResizableProps> = ({
  defaultHeight = 300,
  minHeight = 200,
  maxHeight = window.innerHeight - 200,
  className,
  style,
  children,
  onHeightChange,
}) => {
  const { height, handleMouseDown, handleMouseMove, handleMouseUp } = useDraggable({
    defaultHeight,
    minHeight,
    maxHeight,
    onHeightChange,
  });

  useEffect(() => {
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  return (
    <div
      className={className}
      style={{
        position: 'relative',
        height: `${height}px`,
        ...style,
      }}
    >
      <DragHandle onMouseDown={handleMouseDown} />
      <div style={{ height: `calc(100% - ${height}px)`, marginTop: '8px' }}>{children}</div>
    </div>
  );
};
