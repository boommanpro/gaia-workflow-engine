import { useCallback, useRef, useState } from 'react';

interface UseDraggableProps {
  defaultHeight: number;
  minHeight: number;
  maxHeight: number;
  onHeightChange?: (height: number) => void;
}

export const useDraggable = ({
  defaultHeight,
  minHeight,
  maxHeight,
  onHeightChange,
}: UseDraggableProps) => {
  const [height, setHeight] = useState(defaultHeight);
  const isDragging = useRef(false);
  const startY = useRef(0);
  const startHeight = useRef(0);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    isDragging.current = true;
    startY.current = e.clientY;
    startHeight.current = height;
    e.preventDefault();
  }, [height]);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging.current) return;
      const deltaY = e.clientY - startY.current;
      const newHeight = startHeight.current - deltaY;
      const finalHeight = Math.max(minHeight, Math.min(newHeight, maxHeight));
      setHeight(finalHeight);
      onHeightChange?.(finalHeight);
    },
    [minHeight, maxHeight, onHeightChange]
  );

  const handleMouseUp = useCallback(() => {
    isDragging.current = false;
  }, []);

  return {
    height,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
  };
};
