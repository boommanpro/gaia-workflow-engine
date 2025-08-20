/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import React from 'react';

import { inject, injectable } from 'inversify';
import { domUtils } from '@flowgram.ai/utils';
import { Rectangle } from '@flowgram.ai/utils';
import { WorkflowDocument } from '@flowgram.ai/free-layout-core';
import { FlowNodeTransformData } from '@flowgram.ai/document';
import { Layer } from '@flowgram.ai/core';

import { isEqual, isGreaterThan, isNumber } from './utils';
import { AlignRect, SnapEvent, WorkflowSnapLayerOptions } from './type';
import { WorkflowSnapService } from './service';

interface SnapRenderLine {
  className: string;
  sourceNode: string;
  top: number;
  left: number;
  width: number;
  height: number;
  dashed?: boolean;
}

@injectable()
export class WorkflowSnapLayer extends Layer<WorkflowSnapLayerOptions> {
  public static type = 'WorkflowSnapLayer';

  @inject(WorkflowDocument) private readonly document: WorkflowDocument;

  @inject(WorkflowSnapService) private readonly service: WorkflowSnapService;

  public readonly node = domUtils.createDivWithClass(
    'gedit-playground-layer gedit-flow-snap-layer'
  );

  private edgeLines: SnapRenderLine[] = [];

  private alignLines: SnapRenderLine[] = [];

  public onReady(): void {
    this.node.style.zIndex = '9999';
    this.toDispose.pushAll([
      this.service.onSnap((event: SnapEvent) => {
        this.edgeLines = this.calcEdgeLines(event);
        this.alignLines = this.calcAlignLines(event);
        this.render();
      }),
    ]);
  }

  public render(): JSX.Element {
    return (
      <>
        {this.alignLines.length > 0 && (
          <div className="workflow-snap-align-lines">{this.renderAlignLines()}</div>
        )}
        {this.edgeLines.length > 0 && (
          <div className="workflow-snap-edge-lines">{this.renderEdgeLines()}</div>
        )}
      </>
    );
  }

  public onZoom(scale: number): void {
    this.node.style.transform = `scale(${scale})`;
  }

  private renderEdgeLines(): JSX.Element[] {
    return this.edgeLines.map((renderLine: SnapRenderLine) => {
      const { className, sourceNode, top, left, width, height, dashed } = renderLine;
      const id = `${className}-${sourceNode}-${top}-${left}-${width}-${height}`;
      const isHorizontal = width < height;
      const border = `${this.options.edgeLineWidth}px ${dashed ? 'dashed' : 'solid'} ${
        this.options.edgeColor
      }`;
      return (
        <div
          className={`workflow-snap-edge-line ${className}`}
          data-testid="sdk.workflow.canvas.snap.edgeLine"
          data-snap-line-id={id}
          data-snap-line-source-node={sourceNode}
          key={id}
          style={{
            top,
            left,
            width,
            height,
            position: 'absolute',
            borderLeft: isHorizontal ? border : 'none',
            borderTop: !isHorizontal ? border : 'none',
          }}
        />
      );
    });
  }

  private renderAlignLines(): JSX.Element[] {
    return this.alignLines.map((renderLine: SnapRenderLine) => {
      const id = `${renderLine.className}-${renderLine.sourceNode}-${renderLine.top}-${renderLine.left}-${renderLine.width}-${renderLine.height}`;
      const isHorizontal = isGreaterThan(renderLine.width, renderLine.height);
      const alignLineWidth = this.options.alignLineWidth; // 整体线条粗细
      const alignCrossWidth = this.options.alignCrossWidth; // 工字形横线的长度

      // 调整渲染位置以保持居中
      const adjustedTop = isHorizontal ? renderLine.top - alignLineWidth / 2 : renderLine.top;
      const adjustedLeft = isHorizontal ? renderLine.left : renderLine.left - alignLineWidth / 2;

      return (
        <div
          className={`workflow-snap-align-line ${renderLine.className}`}
          data-testid="sdk.workflow.canvas.snap.alignLine"
          data-snap-line-id={id}
          data-snap-line-source-node={renderLine.sourceNode}
          key={id}
          style={{
            position: 'absolute',
          }}
        >
          {/* 主线 */}
          <div
            style={{
              position: 'absolute',
              top: adjustedTop,
              left: adjustedLeft,
              width: isHorizontal ? renderLine.width : alignLineWidth,
              height: isHorizontal ? alignLineWidth : renderLine.height,
              backgroundColor: this.options.alignColor,
            }}
          />
          {/* 左端或上端横线 */}
          <div
            style={{
              position: 'absolute',
              top: isHorizontal
                ? adjustedTop - (alignCrossWidth - alignLineWidth) / 2
                : adjustedTop,
              left: isHorizontal
                ? adjustedLeft
                : adjustedLeft - (alignCrossWidth - alignLineWidth) / 2,
              width: isHorizontal ? alignLineWidth : alignCrossWidth,
              height: isHorizontal ? alignCrossWidth : alignLineWidth,
              backgroundColor: this.options.alignColor,
            }}
          />
          {/* 右端或下端横线 */}
          <div
            style={{
              position: 'absolute',
              top: isHorizontal
                ? adjustedTop - (alignCrossWidth - alignLineWidth) / 2
                : adjustedTop + renderLine.height - alignLineWidth,
              left: isHorizontal
                ? adjustedLeft + renderLine.width - alignLineWidth
                : adjustedLeft - (alignCrossWidth - alignLineWidth) / 2,
              width: isHorizontal ? alignLineWidth : alignCrossWidth,
              height: isHorizontal ? alignCrossWidth : alignLineWidth,
              backgroundColor: this.options.alignColor,
            }}
          />
        </div>
      );
    });
  }

  private calcEdgeLines(event: SnapEvent): SnapRenderLine[] {
    const { alignRects, snapRect, snapEdgeLines } = event;
    const edgeLines: SnapRenderLine[] = [];

    const topFullAlign = this.directionFullAlign({
      alignRects: alignRects.top,
      targetRect: snapRect,
      isVertical: true,
    });
    const bottomFullAlign = this.directionFullAlign({
      alignRects: alignRects.bottom,
      targetRect: snapRect,
      isVertical: true,
    });
    const leftFullAlign = this.directionFullAlign({
      alignRects: alignRects.left,
      targetRect: snapRect,
      isVertical: false,
    });
    const rightFullAlign = this.directionFullAlign({
      alignRects: alignRects.right,
      targetRect: snapRect,
      isVertical: false,
    });

    // 处理顶部对齐
    if (topFullAlign) {
      const top = topFullAlign.rect.top;
      const height = bottomFullAlign
        ? snapRect.bottom - snapRect.height / 2 - top
        : snapRect.bottom - top;
      const width = this.options.edgeLineWidth;
      const lineData = {
        top,
        width,
        height,
      };
      edgeLines.push({
        className: 'edge-full-top-left',
        sourceNode: topFullAlign.sourceNodeId,
        left: snapRect.left,
        ...lineData,
      });
      edgeLines.push({
        className: 'edge-full-top-right',
        sourceNode: topFullAlign.sourceNodeId,
        left: snapRect.right,
        ...lineData,
      });
      edgeLines.push({
        className: 'edge-full-top-mid',
        sourceNode: topFullAlign.sourceNodeId,
        left: snapRect.left + snapRect.width / 2,
        dashed: true,
        ...lineData,
      });
    }

    // 处理底部对齐
    if (bottomFullAlign) {
      const top = topFullAlign ? snapRect.top + snapRect.height / 2 : snapRect.top;
      const height = bottomFullAlign.rect.bottom - top;
      const width = this.options.edgeLineWidth;
      const lineData = {
        top,
        width,
        height,
      };
      edgeLines.push({
        className: 'edge-full-bottom-left',
        sourceNode: bottomFullAlign.sourceNodeId,
        left: snapRect.left,
        ...lineData,
      });
      edgeLines.push({
        className: 'edge-full-bottom-right',
        sourceNode: bottomFullAlign.sourceNodeId,
        left: snapRect.right,
        ...lineData,
      });
      edgeLines.push({
        className: 'edge-full-bottom-mid',
        sourceNode: bottomFullAlign.sourceNodeId,
        left: snapRect.left + snapRect.width / 2,
        dashed: true,
        ...lineData,
      });
    }

    // 处理左侧对齐
    if (leftFullAlign) {
      const left = leftFullAlign.rect.left;
      const width = rightFullAlign
        ? snapRect.right - snapRect.width / 2 - left
        : snapRect.right - left;
      const height = this.options.edgeLineWidth;
      const lineData = {
        left,
        width,
        height,
      };
      edgeLines.push({
        className: 'edge-full-left-top',
        sourceNode: leftFullAlign.sourceNodeId,
        top: snapRect.top,
        ...lineData,
      });
      edgeLines.push({
        className: 'edge-full-left-bottom',
        sourceNode: leftFullAlign.sourceNodeId,
        top: snapRect.bottom,
        ...lineData,
      });
      edgeLines.push({
        className: 'edge-full-left-mid',
        sourceNode: leftFullAlign.sourceNodeId,
        top: snapRect.top + snapRect.height / 2,
        dashed: true,
        ...lineData,
      });
    }

    // 处理右侧对齐
    if (rightFullAlign) {
      const left = leftFullAlign ? snapRect.left + snapRect.width / 2 : snapRect.left;
      const width = rightFullAlign.rect.right - left;
      const height = this.options.edgeLineWidth;
      const lineData = {
        left,
        width,
        height,
      };
      edgeLines.push({
        className: 'edge-full-right-top',
        sourceNode: rightFullAlign.sourceNodeId,
        top: snapRect.top,
        ...lineData,
      });
      edgeLines.push({
        className: 'edge-full-right-bottom',
        sourceNode: rightFullAlign.sourceNodeId,
        top: snapRect.bottom,
        ...lineData,
      });
      edgeLines.push({
        className: 'edge-full-right-mid',
        sourceNode: rightFullAlign.sourceNodeId,
        top: snapRect.top + snapRect.height / 2,
        dashed: true,
        ...lineData,
      });
    }

    const snappedEdgeLines = Object.entries(snapEdgeLines)
      .map(([direction, snapLine]) => {
        if (!snapLine) {
          return;
        }
        const sourceNode = this.document.getNode(snapLine.sourceNodeId);
        if (!sourceNode) {
          return;
        }
        const nodeRect = sourceNode.getData(FlowNodeTransformData).bounds;
        if (isNumber(snapLine.x)) {
          // 垂直
          const top = Math.min(nodeRect.top, snapRect.top);
          const bottom = Math.max(nodeRect.bottom, snapRect.bottom);
          const height = bottom - top;
          const left = snapLine.x;
          const width = this.options.edgeLineWidth;
          const isMidX = direction === 'midVertical';
          const lineData: SnapRenderLine = {
            className: `edge-snapped-${direction}`,
            sourceNode: snapLine.sourceNodeId,
            top,
            left,
            width,
            height,
            dashed: isMidX,
          };
          const onTop = top === nodeRect.top;
          if (onTop && topFullAlign) {
            return;
          }
          if (!onTop && bottomFullAlign) {
            return;
          }
          return lineData;
        } else if (isNumber(snapLine.y)) {
          // 水平
          const left = Math.min(nodeRect.left, snapRect.left);
          const right = Math.max(nodeRect.right, snapRect.right);
          const width = right - left;
          const top = snapLine.y;
          const height = this.options.edgeLineWidth;
          const isMidY = direction === 'midHorizontal';
          const lineData: SnapRenderLine = {
            className: `edge-snapped-${direction}`,
            sourceNode: snapLine.sourceNodeId,
            top,
            left,
            width,
            height,
            dashed: isMidY,
          };
          const onLeft = left === nodeRect.left;
          if (onLeft && leftFullAlign) {
            return;
          }
          if (!onLeft && rightFullAlign) {
            return;
          }
          return lineData;
        }
      })
      .filter(Boolean) as SnapRenderLine[];

    edgeLines.push(...snappedEdgeLines);

    return edgeLines;
  }

  private directionFullAlign(params: {
    alignRects: AlignRect[];
    targetRect: Rectangle;
    isVertical: boolean;
  }): AlignRect | undefined {
    const { alignRects, targetRect, isVertical } = params;
    let fullAlignIndex = -1;
    for (let i = 0; i < alignRects.length; i++) {
      const alignRect = alignRects[i];
      const prevRect = alignRects[i - 1]?.rect ?? targetRect;
      const isFullAlign = this.rectFullAlign(alignRect.rect, prevRect, isVertical);
      if (!isFullAlign) {
        // 未对齐则中断
        break; // 用 for 循环 + break 反而比 Array.findIndex 实现可读性更好
      }
      fullAlignIndex = i;
    }
    const fullAlignRect = alignRects[fullAlignIndex];
    return fullAlignRect;
  }

  private rectFullAlign(rectA: Rectangle, rectB: Rectangle, isVertical: boolean): boolean {
    if (isVertical) {
      return isEqual(rectA.left, rectB.left) && isEqual(rectA.right, rectB.right);
    } else {
      return isEqual(rectA.top, rectB.top) && isEqual(rectA.bottom, rectB.bottom);
    }
  }

  private calcAlignLines(event: SnapEvent): SnapRenderLine[] {
    const { alignRects, alignSpacing, snapRect } = event;

    const topAlignLines = this.calcDirectionAlignLines({
      alignRects: alignRects.top,
      targetRect: snapRect,
      isVertical: true,
      spacing: alignSpacing.midVertical ?? alignSpacing.top,
    });

    const bottomAlignLines = this.calcDirectionAlignLines({
      alignRects: alignRects.bottom,
      targetRect: snapRect,
      isVertical: true,
      spacing: alignSpacing.midVertical ?? alignSpacing.bottom,
    });

    const leftAlignLines = this.calcDirectionAlignLines({
      alignRects: alignRects.left,
      targetRect: snapRect,
      isVertical: false,
      spacing: alignSpacing.midHorizontal ?? alignSpacing.left,
    });

    const rightAlignLines = this.calcDirectionAlignLines({
      alignRects: alignRects.right,
      targetRect: snapRect,
      isVertical: false,
      spacing: alignSpacing.midHorizontal ?? alignSpacing.right,
    });

    return [...topAlignLines, ...bottomAlignLines, ...leftAlignLines, ...rightAlignLines];
  }

  private calcDirectionAlignLines(params: {
    alignRects: AlignRect[];
    targetRect: Rectangle;
    isVertical: boolean;
    spacing?: number;
  }) {
    const { alignRects, targetRect, isVertical, spacing } = params;
    const alignLines: SnapRenderLine[] = [];
    if (!spacing) {
      return alignLines;
    }
    for (let i = 0; i < alignRects.length; i++) {
      const alignRect = alignRects[i];
      const rect = alignRect.rect;
      const prevRect = alignRects[i - 1]?.rect ?? targetRect;

      const betweenSpacing = isVertical
        ? Math.min(Math.abs(prevRect.top - rect.bottom), Math.abs(prevRect.bottom - rect.top))
        : Math.min(Math.abs(prevRect.left - rect.right), Math.abs(prevRect.right - rect.left));
      if (!isEqual(betweenSpacing, spacing)) {
        // 不连续，需要中断
        break; // 因为要用到 break，所以不能用 Array.map()
      }
      if (isVertical) {
        const centerX = this.calcHorizontalIntersectionCenter(rect, targetRect);
        alignLines.push({
          className: 'align-vertical',
          sourceNode: alignRect.sourceNodeId,
          top: Math.min(rect.bottom, prevRect.bottom),
          left: centerX,
          width: 1,
          height: spacing,
        });
      } else {
        const centerY = this.calcVerticalIntersectionCenter(rect, targetRect);
        alignLines.push({
          className: 'align-horizontal',
          sourceNode: alignRect.sourceNodeId,
          top: centerY,
          left: Math.min(rect.right, prevRect.right),
          width: spacing,
          height: 1,
        });
      }
    }
    return alignLines;
  }

  private calcVerticalIntersectionCenter(rectA: Rectangle, rectB: Rectangle): number {
    const top = Math.max(rectA.top, rectB.top);
    const bottom = Math.min(rectA.bottom, rectB.bottom);
    return (top + bottom) / 2;
  }

  private calcHorizontalIntersectionCenter(rectA: Rectangle, rectB: Rectangle): number {
    const left = Math.max(rectA.left, rectB.left);
    const right = Math.min(rectA.right, rectB.right);
    return (left + right) / 2;
  }
}
