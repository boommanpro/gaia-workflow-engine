/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { inject, injectable } from 'inversify';
import { Disposable, Emitter, Rectangle } from '@flowgram.ai/utils';
import { IPoint } from '@flowgram.ai/utils';
import { WorkflowNodeEntity, WorkflowDocument } from '@flowgram.ai/free-layout-core';
import { WorkflowDragService } from '@flowgram.ai/free-layout-core';
import { FlowNodeTransformData } from '@flowgram.ai/document';
import { FlowNodeBaseType } from '@flowgram.ai/document';
import { EntityManager, PlaygroundConfigEntity, TransformData } from '@flowgram.ai/core';

import { isEqual, isGreaterThan, isLessThan, isLessThanOrEqual, isNumber } from './utils';
import type {
  SnapEvent,
  SnapHorizontalLine,
  SnapLines,
  SnapMidHorizontalLine,
  SnapMidVerticalLine,
  SnapVerticalLine,
  WorkflowSnapServiceOptions,
  AlignRects,
  AlignRect,
  AlignSpacing,
  SnapNodeRect,
  SnapEdgeLines,
} from './type';
import { SnapDefaultOptions } from './constant';

@injectable()
export class WorkflowSnapService {
  @inject(WorkflowDocument) private readonly document: WorkflowDocument;

  @inject(EntityManager) private readonly entityManager: EntityManager;

  @inject(WorkflowDragService)
  private readonly dragService: WorkflowDragService;

  @inject(PlaygroundConfigEntity)
  private readonly playgroundConfig: PlaygroundConfigEntity;

  private disposers: Disposable[] = [];

  private options: WorkflowSnapServiceOptions;

  private snapEmitter = new Emitter<SnapEvent>();

  public readonly onSnap = this.snapEmitter.event;

  private _disabled = false;

  public init(params: Partial<WorkflowSnapServiceOptions> = {}): void {
    this.options = {
      ...SnapDefaultOptions,
      ...params,
    };
    this.mountListener();
  }

  public dispose(): void {
    this.disposers.forEach((disposer) => disposer.dispose());
  }

  public get disabled(): boolean {
    return this._disabled;
  }

  public disable(): void {
    if (this._disabled) {
      return;
    }
    this._disabled = true;
    this.clear();
  }

  public enable(): void {
    if (!this._disabled) {
      return;
    }
    this._disabled = false;
    this.clear();
  }

  private mountListener(): void {
    const dragAdjusterDisposer = this.dragService.registerPosAdjuster((params) => {
      const { selectedNodes: targetNodes, position } = params;
      const isMultiSnapping = this.options.enableMultiSnapping ? false : targetNodes.length !== 1;
      if (this._disabled || !this.options.enableEdgeSnapping || isMultiSnapping) {
        return {
          x: 0,
          y: 0,
        };
      }
      return this.snapping({
        targetNodes,
        position,
      });
    });
    const dragEndDisposer = this.dragService.onNodesDrag((event) => {
      if (event.type !== 'onDragEnd' || this._disabled) {
        return;
      }
      if (this.options.enableGridSnapping) {
        this.gridSnapping({
          targetNodes: event.nodes,
          gridSize: this.options.gridSize,
        });
      }
      if (this.options.enableEdgeSnapping) {
        this.clear();
      }
    });
    this.disposers.push(dragAdjusterDisposer, dragEndDisposer);
  }

  private snapping(params: { targetNodes: WorkflowNodeEntity[]; position: IPoint }): IPoint {
    const { targetNodes, position } = params;

    const targetBounds = this.getBounds(targetNodes);

    const targetRect = new Rectangle(
      position.x,
      position.y,
      targetBounds.width,
      targetBounds.height
    );

    const snapNodeRects = this.getSnapNodeRects({
      targetNodes,
      targetRect,
    });

    const { alignOffset, alignRects, alignSpacing } = this.calcAlignOffset({
      targetRect,
      alignThreshold: this.options.edgeThreshold,
      snapNodeRects,
    });

    const { snapOffset, snapEdgeLines } = this.calcSnapOffset({
      targetRect,
      edgeThreshold: this.options.edgeThreshold,
      snapNodeRects,
    });

    const offset: IPoint = {
      x: snapOffset.x || alignOffset.x,
      y: snapOffset.y || alignOffset.y,
    };

    const snapRect = new Rectangle(
      position.x + offset.x,
      position.y + offset.y,
      targetRect.width,
      targetRect.height
    );

    this.snapEmitter.fire({
      snapRect,
      snapEdgeLines,
      alignRects,
      alignSpacing,
    });

    return offset;
  }

  private calcSnapOffset(params: {
    snapNodeRects: SnapNodeRect[];
    targetRect: Rectangle;
    edgeThreshold: number;
  }): {
    snapOffset: IPoint;
    snapEdgeLines: SnapEdgeLines;
  } {
    const { snapNodeRects, edgeThreshold, targetRect } = params;

    const snapLines = this.getSnapLines({
      snapNodeRects,
    });

    // 找到最近的线条
    const topYClosestLine = snapLines.horizontal.find((line) =>
      isLessThanOrEqual(Math.abs(line.y - targetRect.top), edgeThreshold)
    );
    const bottomYClosestLine = snapLines.horizontal.find((line) =>
      isLessThanOrEqual(Math.abs(line.y - targetRect.bottom), edgeThreshold)
    );
    const leftXClosestLine = snapLines.vertical.find((line) =>
      isLessThanOrEqual(Math.abs(line.x - targetRect.left), edgeThreshold)
    );
    const rightXClosestLine = snapLines.vertical.find((line) =>
      isLessThanOrEqual(Math.abs(line.x - targetRect.right), edgeThreshold)
    );
    const midYClosestLine = snapLines.midHorizontal.find((line) =>
      isLessThanOrEqual(Math.abs(line.y - targetRect.center.y), edgeThreshold)
    );
    const midXClosestLine = snapLines.midVertical.find((line) =>
      isLessThanOrEqual(Math.abs(line.x - targetRect.center.x), edgeThreshold)
    );

    // 计算最近坐标
    const topYClosest = topYClosestLine?.y;
    const bottomYClosest = isNumber(bottomYClosestLine?.y)
      ? bottomYClosestLine!.y - targetRect.height
      : undefined;
    const leftXClosest = leftXClosestLine?.x;
    const rightXClosest = isNumber(rightXClosestLine?.x)
      ? rightXClosestLine!.x - targetRect.width
      : undefined;
    const midYClosest = isNumber(midYClosestLine?.y)
      ? midYClosestLine!.y - targetRect.height / 2
      : undefined;
    const midXClosest = isNumber(midXClosestLine?.x)
      ? midXClosestLine!.x - targetRect.width / 2
      : undefined;

    // 吸附后坐标，按优先级取值
    const snappingPosition = {
      x: midXClosest ?? leftXClosest ?? rightXClosest ?? targetRect.x,
      y: midYClosest ?? topYClosest ?? bottomYClosest ?? targetRect.y,
    };

    // 吸附修正偏移量
    const snapOffset: IPoint = {
      x: snappingPosition.x - targetRect.x,
      y: snappingPosition.y - targetRect.y,
    };

    // 生效的吸附线条
    const snapEdgeLines: SnapEdgeLines = {
      top: isEqual(topYClosest, snappingPosition.y) ? topYClosestLine : undefined,
      bottom: isEqual(bottomYClosest, snappingPosition.y) ? bottomYClosestLine : undefined,
      left: isEqual(leftXClosest, snappingPosition.x) ? leftXClosestLine : undefined,
      right: isEqual(rightXClosest, snappingPosition.x) ? rightXClosestLine : undefined,
      midVertical: isEqual(midXClosest, snappingPosition.x) ? midXClosestLine : undefined,
      midHorizontal: isEqual(midYClosest, snappingPosition.y) ? midYClosestLine : undefined,
    };

    return { snapOffset, snapEdgeLines };
  }

  private gridSnapping(params: { gridSize: number; targetNodes: WorkflowNodeEntity[] }): void {
    const { gridSize, targetNodes } = params;
    const rect = this.getBounds(targetNodes);
    const snap = (value: number) => Math.round(value / gridSize) * gridSize;
    const snappedPosition: IPoint = {
      x: snap(rect.x),
      y: snap(rect.y),
    };
    const offset: IPoint = {
      x: snappedPosition.x - rect.x,
      y: snappedPosition.y - rect.y,
    };
    targetNodes.forEach((node) =>
      this.updateNodePositionWithOffset({
        node,
        offset,
      })
    );
  }

  private clear() {
    this.snapEmitter.fire({
      snapEdgeLines: {},
      snapRect: Rectangle.EMPTY,
      alignRects: {
        top: [],
        bottom: [],
        left: [],
        right: [],
      },
      alignSpacing: {},
    });
  }

  private getSnapLines(params: { snapNodeRects: SnapNodeRect[] }): SnapLines {
    const { snapNodeRects } = params;
    const horizontalLines: SnapHorizontalLine[] = [];
    const verticalLines: SnapVerticalLine[] = [];
    const midHorizontalLines: SnapMidHorizontalLine[] = [];
    const midVerticalLines: SnapMidVerticalLine[] = [];

    snapNodeRects.forEach((snapNodeRect) => {
      const nodeBounds = snapNodeRect.rect;
      const nodeCenter = nodeBounds.center;
      // 边缘横线
      const top: SnapHorizontalLine = {
        y: nodeBounds.top,
        sourceNodeId: snapNodeRect.id,
      };
      const bottom: SnapHorizontalLine = {
        y: nodeBounds.bottom,
        sourceNodeId: snapNodeRect.id,
      };
      // 边缘竖线
      const left: SnapVerticalLine = {
        x: nodeBounds.left,
        sourceNodeId: snapNodeRect.id,
      };
      const right: SnapVerticalLine = {
        x: nodeBounds.right,
        sourceNodeId: snapNodeRect.id,
      };
      // 中间横线
      const midHorizontal: SnapMidHorizontalLine = {
        y: nodeCenter.y,
        sourceNodeId: snapNodeRect.id,
      };
      // 中间竖线
      const midVertical: SnapMidVerticalLine = {
        x: nodeCenter.x,
        sourceNodeId: snapNodeRect.id,
      };
      horizontalLines.push(top, bottom);
      verticalLines.push(left, right);
      midHorizontalLines.push(midHorizontal);
      midVerticalLines.push(midVertical);
    });

    return {
      horizontal: horizontalLines,
      vertical: verticalLines,
      midHorizontal: midHorizontalLines,
      midVertical: midVerticalLines,
    };
  }

  private getAvailableNodes(params: {
    targetNodes: WorkflowNodeEntity[];
    targetRect: Rectangle;
  }): WorkflowNodeEntity[] {
    const { targetNodes, targetRect } = params;

    const targetCenter = targetRect.center;
    const targetContainerId = targetNodes[0].parent?.id ?? this.document.root.id;

    const disabledNodeIds = targetNodes.map((n) => n.id);
    disabledNodeIds.push(FlowNodeBaseType.ROOT);
    const availableNodes = this.nodes
      .filter((n) => n.parent?.id === targetContainerId)
      .filter((n) => !disabledNodeIds.includes(n.id))
      .sort((nodeA, nodeB) => {
        const nodeCenterA = nodeA.getData(FlowNodeTransformData)!.bounds.center;
        const nodeCenterB = nodeB.getData(FlowNodeTransformData)!.bounds.center;
        // 距离越近优先级越高
        const distanceA =
          Math.abs(nodeCenterA.x - targetCenter.x) + Math.abs(nodeCenterA.y - targetCenter.y);
        const distanceB =
          Math.abs(nodeCenterB.x - targetCenter.x) + Math.abs(nodeCenterB.y - targetCenter.y);
        return distanceA - distanceB;
      });
    return availableNodes;
  }

  private viewRect(): Rectangle {
    const { width, height, scrollX, scrollY, zoom } = this.playgroundConfig.config;
    return new Rectangle(scrollX / zoom, scrollY / zoom, width / zoom, height / zoom);
  }

  private getSnapNodeRects(params: {
    targetNodes: WorkflowNodeEntity[];
    targetRect: Rectangle;
  }): SnapNodeRect[] {
    const availableNodes = this.getAvailableNodes(params);
    const viewRect = this.viewRect();
    return availableNodes
      .map((node) => {
        const snapNodeRect: SnapNodeRect = {
          id: node.id,
          rect: node.getData(FlowNodeTransformData).bounds,
          entity: node,
        };
        if (
          this.options.enableOnlyViewportSnapping &&
          node.parent?.flowNodeType === FlowNodeBaseType.ROOT &&
          !Rectangle.intersects(viewRect, snapNodeRect.rect)
        ) {
          // 最外层节点仅包含当前可见节点
          return;
        }
        return snapNodeRect;
      })
      .filter(Boolean) as SnapNodeRect[];
  }

  private get nodes(): WorkflowNodeEntity[] {
    return this.entityManager.getEntities<WorkflowNodeEntity>(WorkflowNodeEntity);
  }

  private getBounds(nodes: WorkflowNodeEntity[]): Rectangle {
    if (nodes.length === 0) {
      return Rectangle.EMPTY;
    }
    return Rectangle.enlarge(nodes.map((n) => n.getData(FlowNodeTransformData)!.bounds));
  }

  private updateNodePositionWithOffset(params: { node: WorkflowNodeEntity; offset: IPoint }): void {
    const { node, offset } = params;
    const transform = node.getData(TransformData);
    const positionWithOffset: IPoint = {
      x: transform.position.x + offset.x,
      y: transform.position.y + offset.y,
    };
    transform.update({
      position: positionWithOffset,
    });
    this.document.layout.updateAffectedTransform(node);
  }

  private calcAlignOffset(params: {
    snapNodeRects: SnapNodeRect[];
    targetRect: Rectangle;
    alignThreshold: number;
  }): {
    alignOffset: IPoint;
    alignRects: AlignRects;
    alignSpacing: AlignSpacing;
  } {
    const { snapNodeRects, targetRect, alignThreshold } = params;

    const alignRects = this.getAlignRects({
      targetRect,
      snapNodeRects,
    });

    const alignSpacing = this.calcAlignSpacing({
      targetRect,
      alignRects,
    });

    let topY: number | undefined;
    let bottomY: number | undefined;
    let leftX: number | undefined;
    let rightX: number | undefined;
    let midY: number | undefined;
    let midX: number | undefined;

    if (alignSpacing.top) {
      const topAlignY = alignRects.top[0].rect.bottom + alignSpacing.top;
      const isAlignTop = isLessThanOrEqual(Math.abs(targetRect.top - topAlignY), alignThreshold);
      if (isAlignTop) {
        // 生效
        topY = topAlignY;
      } else {
        // 失效
        alignSpacing.top = undefined;
      }
    }
    if (alignSpacing.bottom) {
      const bottomAlignY = alignRects.bottom[0].rect.top - alignSpacing.bottom;
      const isAlignBottom = isLessThan(Math.abs(targetRect.bottom - bottomAlignY), alignThreshold);
      if (isAlignBottom) {
        bottomY = bottomAlignY - targetRect.height;
      } else {
        alignSpacing.bottom = undefined;
      }
    }
    if (alignSpacing.left) {
      const leftAlignX = alignRects.left[0].rect.right + alignSpacing.left;
      const isAlignLeft = isLessThanOrEqual(Math.abs(targetRect.left - leftAlignX), alignThreshold);
      if (isAlignLeft) {
        leftX = leftAlignX;
      } else {
        alignSpacing.left = undefined;
      }
    }
    if (alignSpacing.right) {
      const rightAlignX = alignRects.right[0].rect.left - alignSpacing.right;
      const isAlignRight = isLessThanOrEqual(
        Math.abs(targetRect.right - rightAlignX),
        alignThreshold
      );
      if (isAlignRight) {
        rightX = rightAlignX - targetRect.width;
      } else {
        alignSpacing.right = undefined;
      }
    }
    if (alignSpacing.midHorizontal) {
      const leftAlignX = alignRects.left[0].rect.right + alignSpacing.midHorizontal;
      const isAlignMidHorizontal = isLessThanOrEqual(
        Math.abs(targetRect.left - leftAlignX),
        alignThreshold
      );
      if (isAlignMidHorizontal) {
        midX = leftAlignX;
      } else {
        alignSpacing.midHorizontal = undefined;
      }
    }
    if (alignSpacing.midVertical) {
      const topAlignY = alignRects.top[0].rect.bottom + alignSpacing.midVertical;
      const isAlignMidVertical = isLessThanOrEqual(
        Math.abs(targetRect.top - topAlignY),
        alignThreshold
      );
      if (isAlignMidVertical) {
        midY = topAlignY;
      } else {
        alignSpacing.midVertical = undefined;
      }
    }

    const alignPosition: IPoint = {
      x: midX ?? leftX ?? rightX ?? targetRect.x,
      y: midY ?? topY ?? bottomY ?? targetRect.y,
    };

    const alignOffset: IPoint = {
      x: alignPosition.x - targetRect.x,
      y: alignPosition.y - targetRect.y,
    };

    return { alignOffset, alignRects, alignSpacing };
  }

  private calcAlignSpacing(params: {
    targetRect: Rectangle;
    alignRects: AlignRects;
  }): AlignSpacing {
    const { targetRect, alignRects } = params;

    const topSpacing = this.getDirectionAlignSpacing({
      rects: alignRects.top,
      isHorizontal: false,
    });
    const bottomSpacing = this.getDirectionAlignSpacing({
      rects: alignRects.bottom,
      isHorizontal: false,
    });
    const leftSpacing = this.getDirectionAlignSpacing({
      rects: alignRects.left,
      isHorizontal: true,
    });
    const rightSpacing = this.getDirectionAlignSpacing({
      rects: alignRects.right,
      isHorizontal: true,
    });
    const midHorizontalSpacing = this.getMidAlignSpacing({
      rectA: alignRects.left[0]?.rect,
      rectB: alignRects.right[0]?.rect,
      targetRect,
      isHorizontal: true,
    });
    const midVerticalSpacing = this.getMidAlignSpacing({
      rectA: alignRects.top[0]?.rect,
      rectB: alignRects.bottom[0]?.rect,
      targetRect,
      isHorizontal: false,
    });
    return {
      top: topSpacing,
      bottom: bottomSpacing,
      left: leftSpacing,
      right: rightSpacing,
      midHorizontal: midHorizontalSpacing,
      midVertical: midVerticalSpacing,
    };
  }

  private getAlignRects(params: {
    targetRect: Rectangle;
    snapNodeRects: SnapNodeRect[];
  }): AlignRects {
    const { targetRect, snapNodeRects } = params;

    const topVerticalRects: AlignRect[] = [];
    const bottomVerticalRects: AlignRect[] = [];
    const leftHorizontalRects: AlignRect[] = [];
    const rightHorizontalRects: AlignRect[] = [];

    snapNodeRects.forEach((snapNodeRect) => {
      const nodeRect = snapNodeRect.rect;
      const { isVerticalIntersection, isHorizontalIntersection, isIntersection } =
        this.intersection(nodeRect, targetRect);
      if (isIntersection) {
        // 忽略重叠的节点
        return;
      } else if (isVerticalIntersection) {
        // 垂直重合
        if (isGreaterThan(nodeRect.center.y, targetRect.center.y)) {
          // 下方
          bottomVerticalRects.push({
            rect: nodeRect,
            sourceNodeId: snapNodeRect.id,
          });
        } else {
          // 上方
          topVerticalRects.push({
            rect: nodeRect,
            sourceNodeId: snapNodeRect.id,
          });
        }
      } else if (isHorizontalIntersection) {
        // 水平重合
        if (isGreaterThan(nodeRect.center.x, targetRect.center.x)) {
          // 右方
          rightHorizontalRects.push({
            rect: nodeRect,
            sourceNodeId: snapNodeRect.id,
          });
        } else {
          // 左方
          leftHorizontalRects.push({
            rect: nodeRect,
            sourceNodeId: snapNodeRect.id,
          });
        }
      }
    });

    return {
      top: topVerticalRects,
      bottom: bottomVerticalRects,
      left: leftHorizontalRects,
      right: rightHorizontalRects,
    };
  }

  private getMidAlignSpacing(params: {
    rectA?: Rectangle;
    rectB?: Rectangle;
    targetRect: Rectangle;
    isHorizontal: boolean;
  }): number | undefined {
    const { rectA, rectB, targetRect, isHorizontal } = params;
    if (!rectA || !rectB) {
      return;
    }
    const { isVerticalIntersection, isHorizontalIntersection, isIntersection } = this.intersection(
      rectA,
      rectB
    );
    if (isIntersection) {
      return;
    }
    if (isHorizontal && isHorizontalIntersection && !isVerticalIntersection) {
      const betweenSpacing = Math.min(
        Math.abs(rectA.left - rectB.right),
        Math.abs(rectA.right - rectB.left)
      );
      return (betweenSpacing - targetRect.width) / 2;
    } else if (!isHorizontal && isVerticalIntersection && !isHorizontalIntersection) {
      const betweenSpacing = Math.min(
        Math.abs(rectA.top - rectB.bottom),
        Math.abs(rectA.bottom - rectB.top)
      );
      return (betweenSpacing - targetRect.height) / 2;
    }
  }

  private getDirectionAlignSpacing(params: {
    rects: AlignRect[];
    isHorizontal: boolean;
  }): number | undefined {
    const { rects, isHorizontal } = params;
    if (rects.length < 2) {
      // 非法情况
      return;
    }
    const rectA = rects[0].rect;
    const rectB = rects[1].rect;

    const { isVerticalIntersection, isHorizontalIntersection, isIntersection } = this.intersection(
      rectA,
      rectB
    );

    if (isIntersection) {
      // 非法情况：重叠
      return;
    }
    if (isHorizontal && isHorizontalIntersection && !isVerticalIntersection) {
      return Math.min(Math.abs(rectA.left - rectB.right), Math.abs(rectA.right - rectB.left));
    } else if (!isHorizontal && isVerticalIntersection && !isHorizontalIntersection) {
      return Math.min(Math.abs(rectA.top - rectB.bottom), Math.abs(rectA.bottom - rectB.top));
    }
    return;
  }

  private intersection(
    rectA: Rectangle,
    rectB: Rectangle
  ): {
    isHorizontalIntersection: boolean;
    isVerticalIntersection: boolean;
    isIntersection: boolean;
  } {
    const isVerticalIntersection =
      isLessThan(rectA.left, rectB.right) && isGreaterThan(rectA.right, rectB.left);
    const isHorizontalIntersection =
      isLessThan(rectA.top, rectB.bottom) && isGreaterThan(rectA.bottom, rectB.top);
    const isIntersection = isHorizontalIntersection && isVerticalIntersection;

    return {
      isHorizontalIntersection,
      isVerticalIntersection,
      isIntersection,
    };
  }
}
