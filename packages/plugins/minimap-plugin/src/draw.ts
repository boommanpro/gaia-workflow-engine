/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import type { IPoint, Rectangle } from '@flowgram.ai/utils';

export namespace MinimapDraw {
  /** 矩形是否合法 */
  const isRectValid = (rect: Rectangle): boolean => rect.width > 0 && rect.height > 0;

  /** 清空画布 */
  export const clear = (params: {
    canvas: HTMLCanvasElement;
    context: CanvasRenderingContext2D;
  }) => {
    const { canvas, context } = params;
    context.clearRect(0, 0, canvas.width, canvas.height);
  };

  /** 设置背景色 */
  export const backgroundColor = (params: {
    canvas: HTMLCanvasElement;
    context: CanvasRenderingContext2D;
    color: string;
  }) => {
    const { canvas, context, color } = params;
    context.fillStyle = color;
    context.fillRect(0, 0, canvas.width, canvas.height);
  };

  /** 绘制矩形 */
  export const rectangle = (params: {
    context: CanvasRenderingContext2D;
    rect: Rectangle;
    color: string;
  }): void => {
    const { context, rect, color } = params;
    if (!isRectValid(rect)) {
      return;
    }
    context.fillStyle = color;
    context.fillRect(rect.x, rect.y, rect.width, rect.height);
  };

  /** 绘制圆角矩形 */
  export const roundRectangle = (params: {
    context: CanvasRenderingContext2D;
    rect: Rectangle;
    color: string;
    radius: number;
    borderColor?: string;
    borderWidth?: number;
    borderDashLength?: number;
  }): void => {
    const { context, rect, color, radius, borderColor, borderDashLength, borderWidth = 0 } = params;
    const { x, y, width, height } = rect;

    if (!isRectValid(rect)) {
      return;
    }

    // 开始新路径
    context.beginPath();

    // 绘制圆角矩形路径
    const drawRoundedRectPath = (): void => {
      context.moveTo(x + radius, y);
      context.lineTo(x + width - radius, y);
      context.quadraticCurveTo(x + width, y, x + width, y + radius);
      context.lineTo(x + width, y + height - radius);
      context.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
      context.lineTo(x + radius, y + height);
      context.quadraticCurveTo(x, y + height, x, y + height - radius);
      context.lineTo(x, y + radius);
      context.quadraticCurveTo(x, y, x + radius, y);
      context.closePath();
    };

    drawRoundedRectPath();

    // 填充矩形
    context.fillStyle = color;
    context.fill();

    // 如果设置了边框，绘制边框
    if (borderColor && borderWidth > 0) {
      context.strokeStyle = borderColor;
      context.lineWidth = borderWidth;

      // 设置虚线样式
      if (borderDashLength) {
        context.setLineDash([borderDashLength, borderDashLength]);
      } else {
        context.setLineDash([]);
      }

      context.stroke();

      // 重置虚线样式
      context.setLineDash([]);
    }
  };

  /** 绘制矩形外的蒙层 */
  export const overlay = (params: {
    canvas: HTMLCanvasElement;
    context: CanvasRenderingContext2D;
    offset: IPoint;
    scale: number;
    rect: Rectangle;
    color: string;
  }): void => {
    const { canvas, context, offset, scale, rect, color } = params;

    if (!isRectValid(rect)) {
      return;
    }

    context.fillStyle = color;

    // 上方蒙层
    context.fillRect(0, 0, canvas.width, (rect.y + offset.y) * scale);

    // 下方蒙层
    context.fillRect(
      0,
      (rect.y + rect.height + offset.y) * scale,
      canvas.width,
      canvas.height - (rect.y + rect.height + offset.y) * scale
    );

    // 左侧蒙层
    context.fillRect(
      0,
      (rect.y + offset.y) * scale,
      (rect.x + offset.x) * scale,
      rect.height * scale
    );

    // 右侧蒙层
    context.fillRect(
      (rect.x + rect.width + offset.x) * scale,
      (rect.y + offset.y) * scale,
      canvas.width - (rect.x + rect.width + offset.x) * scale,
      rect.height * scale
    );
  };
}
