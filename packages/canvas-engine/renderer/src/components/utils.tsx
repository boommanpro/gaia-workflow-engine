/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import type React from 'react';

import {
  FlowNodeTransformData,
  type FlowNodeTransitionData,
  type FlowTransitionLine,
  FlowTransitionLineEnum,
  type Vertex,
  DefaultSpacingKey,
  DEFAULT_SPACING,
} from '@flowgram.ai/document';

import { BASE_DEFAULT_COLOR } from '../hooks/use-base-color';

export const DEFAULT_LINE_ATTRS: React.SVGProps<SVGPathElement> = {
  stroke: BASE_DEFAULT_COLOR,
  fill: 'transparent',
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
};

// 默认的圆角半径
export const DEFAULT_RADIUS = 16;

// 小圆角
export const MINI_RADIUS = 10;

// 默认 label 激活高度
export const DEFAULT_LABEL_ACTIVATE_HEIGHT = 32;

/**
 * 根据椭圆方程计算 y 坐标
 *
 * x^2 / rx^2 + y^2 / ry^2 = 1
 */
export const calcEllipseY = (x: number, rx: number, ry: number) =>
  Math.sqrt(ry ** 2 * (1 - x ** 2 / rx ** 2));

/**
 * 获取转弯线的转折点 (水平布局)
 */
export function getHorizontalVertices(
  line: FlowTransitionLine,
  xRadius = 16,
  yRadius = 20
): Vertex[] {
  const { from, to, type } = line || {};

  // 空间可以容纳的圆角数
  const deltaY = Math.abs(to.y - from.y);
  const deltaX = Math.abs(to.x - from.x);

  const radiusXCount = deltaX / xRadius;
  const radiusYCount = deltaY / yRadius;

  let res: Vertex[] = [];

  // 容纳不下一个圆角，直接连线
  if (radiusXCount < 1) {
    return [];
  }

  switch (type) {
    case FlowTransitionLineEnum.DIVERGE_LINE:
    case FlowTransitionLineEnum.DRAGGING_LINE:
      if (radiusXCount <= 1) {
        return [
          {
            x: to.x,
            y: from.y,
            radiusX: deltaX,
          },
        ];
      }
      res = [
        {
          x: from.x + yRadius,
          y: from.y,
        },
        {
          x: from.x + yRadius,
          y: to.y,
        },
      ];
      if (radiusXCount < 2) {
        const firstRadius = deltaX - yRadius;
        res = [
          {
            x: from.x + firstRadius,
            y: from.y,
            // 第一个圆角收缩 y 半径
            radiusX: firstRadius,
          },
          {
            x: from.x + firstRadius,
            y: to.y,
          },
        ];
      }

      // y 轴空间不足处理
      if (radiusYCount < 2) {
        res[0].moveY = deltaY / 2;
        res[1].moveY = deltaY / 2;
      }

      return res;

    case FlowTransitionLineEnum.MERGE_LINE:
      // 聚合线 y 轴空间不足时直接连上
      if (radiusXCount < 2) {
        return [
          {
            x: to.x,
            y: from.y,
          },
        ];
      }

      res = [
        {
          x: to.x - yRadius,
          y: from.y,
        },
        {
          x: to.x - yRadius,
          y: to.y,
        },
      ];

      // y 轴空间不足处理
      if (radiusYCount < 2) {
        res[0].moveY = deltaY / 2;
        res[1].moveY = deltaY / 2;
      }

      return res;

    default:
      break;
  }

  return [];
}
/**
 * 获取转弯线的转折点 (垂直布局)
 */
export function getVertices(line: FlowTransitionLine, xRadius = 16, yRadius = 20): Vertex[] {
  const { from, to, type } = line || {};

  // 空间可以容纳的圆角数
  const deltaY = Math.abs(to.y - from.y);
  const deltaX = Math.abs(to.x - from.x);

  const radiusYCount = deltaY / yRadius;
  const radiusXCount = deltaX / xRadius;

  let res: Vertex[] = [];

  // 容纳不下一个圆角，直接连线
  if (radiusYCount < 1) {
    return [];
  }

  switch (type) {
    case FlowTransitionLineEnum.DIVERGE_LINE:
    case FlowTransitionLineEnum.DRAGGING_LINE:
      if (radiusYCount <= 1) {
        return [
          {
            x: to.x,
            y: from.y,
            radiusY: deltaY,
          },
        ];
      }
      res = [
        {
          x: from.x,
          y: from.y + yRadius,
        },
        {
          x: to.x,
          y: from.y + yRadius,
        },
      ];
      if (radiusYCount < 2) {
        const firstRadius = deltaY - yRadius;
        res = [
          {
            x: from.x,
            y: from.y + firstRadius,
            // 第一个圆角收缩 y 半径
            radiusY: firstRadius,
          },
          {
            x: to.x,
            y: from.y + firstRadius,
          },
        ];
      }

      // x 轴空间不足处理
      if (radiusXCount < 2) {
        res[0].moveX = deltaX / 2;
        res[1].moveX = deltaX / 2;
      }

      return res;

    case FlowTransitionLineEnum.MERGE_LINE:
      // 聚合线 y 轴空间不足时直接连上
      if (radiusYCount < 2) {
        return [
          {
            x: from.x,
            y: to.y,
          },
        ];
      }

      res = [
        {
          x: from.x,
          y: to.y - yRadius,
        },
        {
          x: to.x,
          y: to.y - yRadius,
        },
      ];

      // x 轴空间不足处理
      if (radiusXCount < 2) {
        res[0].moveX = deltaX / 2;
        res[1].moveX = deltaX / 2;
      }

      return res;

    default:
      break;
  }

  return [];
}

// 获取上一个节点和下一个节点中较宽的宽度作为 hover 热区
export function getTransitionLabelHoverWidth(data: FlowNodeTransitionData) {
  const { isVertical } = data.entity;
  if (isVertical) {
    const nextWidth =
      data.entity.next?.firstChild && !data.entity.next.isInlineBlocks
        ? data.entity.next.firstChild!.getData(FlowNodeTransformData)!.size.width
        : data.entity.next?.getData(FlowNodeTransformData)!.size.width;

    // 获取上一个节点和下一个节点中较宽的宽度作为 hover 热区
    const maxWidth = Math.max(
      data.entity.getData(FlowNodeTransformData)?.size.width ??
        DEFAULT_SPACING[DefaultSpacingKey.HOVER_AREA_WIDTH],
      nextWidth || 0
    );

    return maxWidth;
  }
  if (data.transform.next) {
    return data.transform.next.inputPoint.x - data.transform.outputPoint.x;
  }
  return DEFAULT_LABEL_ACTIVATE_HEIGHT;
}

export function getTransitionLabelHoverHeight(data: FlowNodeTransitionData) {
  const { isVertical } = data.entity;
  if (isVertical) {
    if (data.transform.next) {
      return data.transform.next.inputPoint.y - data.transform.outputPoint.y;
    }
    return DEFAULT_LABEL_ACTIVATE_HEIGHT;
  }
  const nextHeight =
    data.entity.next?.firstChild && !data.entity.next.isInlineBlocks
      ? data.entity.next.firstChild!.getData(FlowNodeTransformData)!.size.height
      : data.entity.next?.getData(FlowNodeTransformData)!.size.height;

  // 获取上一个节点和下一个节点中较宽的宽度作为 hover 热区
  const maxHeight = Math.max(
    data.entity.getData(FlowNodeTransformData)?.size.height || 280,
    nextHeight || 0
  );

  return maxHeight;
}
