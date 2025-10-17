/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import React, { CSSProperties, useEffect, useRef, useState } from 'react';

import { usePlaygroundContainer } from '@flowgram.ai/core';

import { MinimapInactiveStyle } from './type';
import { FlowMinimapService } from './service';
import { MinimapDefaultInactiveStyle } from './constant';

interface MinimapProps {
  service?: FlowMinimapService;
  panelStyles?: CSSProperties;
  containerStyles?: CSSProperties;
  inactiveStyle?: Partial<MinimapInactiveStyle>;
}

export const MinimapRender: React.FC<MinimapProps> = (props) => {
  const { panelStyles = {}, containerStyles = {}, inactiveStyle: customInactiveStyle = {} } = props;
  const inactiveStyle = {
    ...MinimapDefaultInactiveStyle,
    ...customInactiveStyle,
  };
  const playgroundContainer = usePlaygroundContainer();
  const service = props.service || playgroundContainer?.get(FlowMinimapService);
  const panelRef = useRef<HTMLDivElement>(null);
  const [activated, setActivated] = useState<boolean>(false);

  useEffect(() => {
    const canvasContainer: HTMLDivElement | null = panelRef.current;
    if (canvasContainer && service.canvas) {
      canvasContainer.appendChild(service.canvas);
    }
    const disposer = service.onActive((activate: boolean) => {
      setActivated(activate);
    });
    service.setVisible(true);
    service.render();
    return () => {
      disposer.dispose();
      service.setVisible(false);
    };
  }, [service]);

  // 计算缩放比例和透明度
  const scale: number = activated ? 1 : inactiveStyle.scale;
  const opacity: number = activated ? 1 : inactiveStyle.opacity;

  // 计算偏移量
  const translateX: number = activated ? 0 : inactiveStyle.translateX; // 向右偏移的像素
  const translateY: number = activated ? 0 : inactiveStyle.translateY; // 向下偏移的像素

  return (
    <div
      className="minimap-container"
      style={{
        position: 'fixed',
        right: 30,
        bottom: 70,
        transition: 'all 0.3s ease', // 添加过渡效果
        transform: `scale(${scale}) translate(${translateX}px, ${translateY}px)`,
        opacity: opacity,
        transformOrigin: 'bottom right', // 设置变换的原点
        ...containerStyles,
      }}
    >
      <div
        className="minimap-panel"
        style={{
          display: 'flex',
          width: '100%',
          height: '100%',
          borderRadius: '10px',
          backgroundColor: 'rgba(255, 255, 255, 1)',
          border: '0.572px solid rgba(6, 7, 9, 0.10)',
          overflow: 'hidden',
          boxShadow:
            '0px 2.289px 6.867px 0px rgba(0, 0, 0, 0.08), 0px 4.578px 13.733px 0px rgba(0, 0, 0, 0.04)',
          boxSizing: 'border-box',
          padding: 8,
          ...panelStyles,
        }}
        data-flow-editor-selectable="false"
        ref={panelRef}
        onMouseEnter={() => {
          service.setActivate(true);
        }}
        onMouseLeave={() => {
          service.setActivate(false);
        }}
        onTouchStartCapture={() => {
          service.setActivate(true);
        }}
        onTouchEndCapture={() => {
          service.setActivate(false);
        }}
      ></div>
    </div>
  );
};
