/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import type { MinimapCanvasStyle, MinimapInactiveStyle, MinimapServiceOptions } from './type';

export const MinimapDefaultCanvasStyle: MinimapCanvasStyle = {
  canvasWidth: 250,
  canvasHeight: 250,
  canvasPadding: 50,
  canvasBackground: 'rgba(242, 243, 245, 1)',
  canvasBorderRadius: 10,
  viewportBackground: 'rgba(255, 255, 255, 1)',
  viewportBorderRadius: 4,
  viewportBorderColor: 'rgba(6, 7, 9, 0.10)',
  viewportBorderWidth: 1,
  viewportBorderDashLength: undefined,
  nodeColor: 'rgba(0, 0, 0, 0.10)',
  nodeBorderRadius: 2,
  nodeBorderWidth: 0.145,
  nodeBorderColor: 'rgba(6, 7, 9, 0.10)',
  overlayColor: 'rgba(255, 255, 255, 0.55)',
};

export const MinimapDefaultInactiveStyle: MinimapInactiveStyle = {
  scale: 0.7,
  opacity: 1,
  translateX: 15,
  translateY: 15,
};

export const MinimapDefaultOptions: MinimapServiceOptions = {
  canvasStyle: MinimapDefaultCanvasStyle,
  canvasClassName: 'gedit-minimap-canvas',
  enableDisplayAllNodes: false,
  activeThrottleTime: 0,
  inactiveThrottleTime: 24,
};
