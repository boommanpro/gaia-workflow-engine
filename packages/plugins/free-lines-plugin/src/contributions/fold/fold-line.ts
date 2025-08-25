/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { type IPoint, Point, Rectangle } from '@flowgram.ai/utils';
import { LinePoint } from '@flowgram.ai/free-layout-core';

/**
 * 计算点到线段的距离
 * @param point 待测试点
 * @param segStart 线段起点
 * @param segEnd 线段终点
 */
const getPointToSegmentDistance = (point: IPoint, segStart: IPoint, segEnd: IPoint): number => {
  const { x: px, y: py } = point;
  const { x: x1, y: y1 } = segStart;
  const { x: x2, y: y2 } = segEnd;

  const A = px - x1;
  const B = py - y1;
  const C = x2 - x1;
  const D = y2 - y1;

  const dot = A * C + B * D;
  const lenSq = C * C + D * D;

  // 参数方程中的t参数
  const param = lenSq === 0 ? -1 : dot / lenSq;

  let xx: number;
  let yy: number;

  if (param < 0) {
    xx = x1;
    yy = y1;
  } else if (param > 1) {
    xx = x2;
    yy = y2;
  } else {
    xx = x1 + param * C;
    yy = y1 + param * D;
  }

  const dx = px - xx;
  const dy = py - yy;

  return Math.sqrt(dx * dx + dy * dy);
};

/**
 * Fork from: https://github.com/xyflow/xyflow/blob/main/packages/system/src/utils/edges/smoothstep-edge.ts
 * MIT License
 * Copyright (c) 2019-2024 webkid GmbH
 */
export namespace FoldLine {
  const EDGE_RADIUS = 5;
  const OFFSET = 20;

  function getEdgeCenter({ source, target }: { source: IPoint; target: IPoint }): [number, number] {
    const xOffset = Math.abs(target.x - source.x) / 2;
    const centerX = target.x < source.x ? target.x + xOffset : target.x - xOffset;

    const yOffset = Math.abs(target.y - source.y) / 2;
    const centerY = target.y < source.y ? target.y + yOffset : target.y - yOffset;

    return [centerX, centerY];
  }

  const getDirection = ({ source, target }: { source: LinePoint; target: LinePoint }): IPoint => {
    if (source.location === 'left' || source.location === 'right') {
      return source.x < target.x ? { x: 1, y: 0 } : { x: -1, y: 0 };
    }
    return source.y < target.y ? { x: 0, y: 1 } : { x: 0, y: -1 };
  };

  const handleDirections = {
    left: { x: -1, y: 0 },
    right: { x: 1, y: 0 },
    top: { x: 0, y: -1 },
    bottom: { x: 0, y: 1 },
  };
  // eslint-disable-next-line complexity
  export function getPoints({ source, target }: { source: LinePoint; target: LinePoint }): {
    points: IPoint[];
    center: IPoint;
  } {
    const sourceDir = handleDirections[source.location];
    const targetDir = handleDirections[target.location];
    const sourceGapped: LinePoint = {
      x: source.x + sourceDir.x * OFFSET,
      y: source.y + sourceDir.y * OFFSET,
      location: source.location,
    };
    const targetGapped: LinePoint = {
      x: target.x + targetDir.x * OFFSET,
      y: target.y + targetDir.y * OFFSET,
      location: target.location,
    };
    const dir = getDirection({
      source: sourceGapped,
      target: targetGapped,
    });
    const dirAccessor = dir.x !== 0 ? 'x' : 'y';
    const currDir = dir[dirAccessor];

    let points: IPoint[] = [];
    let centerX, centerY;

    const [defaultCenterX, defaultCenterY] = getEdgeCenter({
      source,
      target,
    });

    // 计算向量乘积
    if (sourceDir[dirAccessor] * targetDir[dirAccessor] === -1) {
      centerX = defaultCenterX;
      centerY = defaultCenterY;

      const verticalSplit: IPoint[] = [
        { x: centerX, y: sourceGapped.y },
        { x: centerX, y: targetGapped.y },
      ];

      const horizontalSplit: IPoint[] = [
        { x: sourceGapped.x, y: centerY },
        { x: targetGapped.x, y: centerY },
      ];

      if (sourceDir[dirAccessor] === currDir) {
        points = dirAccessor === 'x' ? verticalSplit : horizontalSplit;
      } else {
        points = dirAccessor === 'x' ? horizontalSplit : verticalSplit;
      }
    } else {
      // sourceTarget means we take x from source and y from target, targetSource is the opposite
      const sourceTarget: IPoint[] = [{ x: sourceGapped.x, y: targetGapped.y }];
      const targetSource: IPoint[] = [{ x: targetGapped.x, y: sourceGapped.y }];
      // this handles edges with same handle positions
      if (dirAccessor === 'x') {
        points = sourceDir.x === currDir ? targetSource : sourceTarget;
      } else {
        points = sourceDir.y === currDir ? sourceTarget : targetSource;
      }

      // these are conditions for handling mixed handle positions like Right -> Bottom for example
      const dirAccessorOpposite = dirAccessor === 'x' ? 'y' : 'x';
      const isSameDir = sourceDir[dirAccessor] === targetDir[dirAccessorOpposite];
      const sourceGtTargetOppo =
        sourceGapped[dirAccessorOpposite] > targetGapped[dirAccessorOpposite];
      const sourceLtTargetOppo =
        sourceGapped[dirAccessorOpposite] < targetGapped[dirAccessorOpposite];
      const flipSourceTarget =
        (sourceDir[dirAccessor] === 1 &&
          ((!isSameDir && sourceGtTargetOppo) || (isSameDir && sourceLtTargetOppo))) ||
        (sourceDir[dirAccessor] !== 1 &&
          ((!isSameDir && sourceLtTargetOppo) || (isSameDir && sourceGtTargetOppo)));

      if (flipSourceTarget) {
        points = dirAccessor === 'x' ? sourceTarget : targetSource;
      }

      const sourceGapPoint = { x: sourceGapped.x, y: sourceGapped.y };
      const targetGapPoint = { x: targetGapped.x, y: targetGapped.y };
      const maxXDistance = Math.max(
        Math.abs(sourceGapPoint.x - points[0].x),
        Math.abs(targetGapPoint.x - points[0].x)
      );
      const maxYDistance = Math.max(
        Math.abs(sourceGapPoint.y - points[0].y),
        Math.abs(targetGapPoint.y - points[0].y)
      );

      if (maxXDistance >= maxYDistance) {
        centerX = (sourceGapPoint.x + targetGapPoint.x) / 2;
        centerY = points[0].y;
      } else {
        centerX = points[0].x;
        centerY = (sourceGapPoint.y + targetGapPoint.y) / 2;
      }
    }

    const pathPoints = [
      source,
      { x: sourceGapped.x, y: sourceGapped.y },
      ...points,
      { x: targetGapped.x, y: targetGapped.y },
      target,
    ];

    return {
      points: pathPoints,
      center: {
        x: centerX,
        y: centerY,
      },
    };
  }

  function getBend(a: IPoint, b: IPoint, c: IPoint): string {
    const bendSize = Math.min(
      Point.getDistance(a, b) / 2,
      Point.getDistance(b, c) / 2,
      EDGE_RADIUS
    );
    const { x, y } = b;

    // no bend
    if ((a.x === x && x === c.x) || (a.y === y && y === c.y)) {
      return `L${x} ${y}`;
    }

    // first segment is horizontal
    if (a.y === y) {
      const xDir = a.x < c.x ? -1 : 1;
      const yDir = a.y < c.y ? 1 : -1;
      return `L ${x + bendSize * xDir},${y}Q ${x},${y} ${x},${y + bendSize * yDir}`;
    }

    const xDir = a.x < c.x ? 1 : -1;
    const yDir = a.y < c.y ? -1 : 1;
    return `L ${x},${y + bendSize * yDir}Q ${x},${y} ${x + bendSize * xDir},${y}`;
  }

  /**
   * 实现 reactFlow 原本的折叠线交互
   */
  export function getSmoothStepPath(points: IPoint[]): string {
    const path = points.reduce<string>((res, p, i) => {
      let segment = '';

      if (i > 0 && i < points.length - 1) {
        segment = getBend(points[i - 1], p, points[i + 1]);
      } else {
        segment = `${i === 0 ? 'M' : 'L'}${p.x} ${p.y}`;
      }

      res += segment;

      return res;
    }, '');

    return path;
  }
  export function getBounds(points: IPoint[]): Rectangle {
    const xList = points.map((p) => p.x);
    const yList = points.map((p) => p.y);
    const left = Math.min(...xList);
    const right = Math.max(...xList);
    const top = Math.min(...yList);
    const bottom = Math.max(...yList);
    return Rectangle.createRectangleWithTwoPoints(
      {
        x: left,
        y: top,
      },
      {
        x: right,
        y: bottom,
      }
    );
  }
  /**
   * 计算点到折线的最短距离
   * @param points 折线的所有端点
   * @param pos 待测试点
   * @returns 最短距离
   */
  export const getFoldLineToPointDistance = (points: IPoint[], pos: IPoint): number => {
    // 特殊情况处理
    if (points.length === 0) {
      return Infinity;
    }

    if (points.length === 1) {
      return Point.getDistance(points[0]!, pos);
    }

    // 构建线段数组
    const lines: [IPoint, IPoint][] = [];
    for (let i = 0; i < points.length - 1; i++) {
      lines.push([points[i]!, points[i + 1]!]);
    }

    // 计算点到每个线段的最短距离
    const distances = lines.map((line) => {
      const [p1, p2] = line;
      return getPointToSegmentDistance(pos, p1, p2);
    });

    return Math.min(...distances);
  };
}
