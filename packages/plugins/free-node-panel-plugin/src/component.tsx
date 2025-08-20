/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import React, { FC, ReactNode, useEffect, useRef } from 'react';

import { PositionSchema } from '@flowgram.ai/utils';

interface NodePanelContainerProps {
  onSelect: (nodeType: string | undefined) => void;
  position: PositionSchema;
  children: ReactNode;
}

export const NodePanelContainer: FC<NodePanelContainerProps> = (props) => {
  const { onSelect, position, children } = props;
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // 确保点击事件的目标不是组件本身或其子元素
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        onSelect(undefined);
      }
    };
    // 添加事件监听器到document
    document.addEventListener('mousedown', handleClickOutside);
    // 清理函数
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onSelect]); // 依赖项为onSelect，确保回调函数变化时重新绑定

  return (
    <div
      ref={panelRef}
      className="node-panel-container"
      data-flow-editor-selectable="false"
      style={{
        position: 'absolute',
        zIndex: 9999,
        top: position.y,
        left: position.x,
      }}
    >
      {children}
    </div>
  );
};
