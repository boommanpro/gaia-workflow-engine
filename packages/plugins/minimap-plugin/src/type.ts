/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { CSSProperties } from 'react';

import type { IPoint, Rectangle } from '@flowgram.ai/utils';

export interface MinimapCanvasStyle {
  canvasWidth: number;
  canvasHeight: number;
  canvasPadding: number;
  canvasBackground: string;
  canvasBorderRadius: number | undefined;
  viewportBackground: string;
  viewportBorderRadius: number | undefined;
  viewportBorderColor: string;
  viewportBorderWidth: number;
  viewportBorderDashLength: number | undefined;
  nodeColor: string;
  nodeBorderRadius: number | undefined;
  nodeBorderWidth: number;
  nodeBorderColor: string | undefined;
  overlayColor: string;
}

export interface MinimapInactiveStyle {
  scale: number;
  opacity: number;
  translateX: number;
  translateY: number;
}

export interface MinimapServiceOptions {
  canvasStyle: Partial<MinimapCanvasStyle>;
  canvasClassName: string;
  enableDisplayAllNodes: boolean;
  activeThrottleTime: number;
  inactiveThrottleTime: number;
}

export interface MinimapLayerOptions {
  disableLayer?: boolean;
  panelStyles?: CSSProperties;
  containerStyles?: CSSProperties;
  inactiveStyle?: Partial<MinimapInactiveStyle>;
}

export interface CreateMinimapPluginOptions
  extends MinimapLayerOptions,
    Partial<MinimapServiceOptions> {}

export interface MinimapRenderContext {
  canvas: HTMLCanvasElement;
  context2D: CanvasRenderingContext2D;
  nodeRects: Rectangle[];
  viewRect: Rectangle;
  renderRect: Rectangle;
  canvasRect: Rectangle;
  scale: number;
  offset: IPoint;
}
