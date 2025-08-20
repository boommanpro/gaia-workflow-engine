/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { IPoint, PaddingSchema, Point } from '@flowgram.ai/utils';
import {
  FlowGroupController,
  FlowNodeBaseType,
  FlowNodeRegistry,
  FlowNodeTransformData,
  FlowTransitionLabelEnum,
  type FlowTransitionLine,
  FlowTransitionLineEnum,
} from '@flowgram.ai/document';

import { GroupRenderer, PositionConfig } from './constant';

export const GroupRegister: FlowNodeRegistry = {
  type: FlowNodeBaseType.GROUP,
  meta: {
    exportJSON: true,
    renderKey: GroupRenderer.GroupRender,
    positionConfig: PositionConfig,
    padding: (transform: FlowNodeTransformData): PaddingSchema => {
      const groupController = FlowGroupController.create(transform.entity);
      if (!groupController || groupController.collapsed || groupController.nodes.length === 0) {
        return {
          top: 0,
          bottom: 0,
          left: 0,
          right: 0,
        };
      }
      if (transform.entity.isVertical) {
        return {
          top: PositionConfig.paddingWithNote,
          bottom: PositionConfig.paddingWithAddLabel,
          left: PositionConfig.padding,
          right: PositionConfig.padding,
        };
      }
      return {
        top: PositionConfig.paddingWithNote,
        bottom: PositionConfig.padding,
        left: PositionConfig.padding,
        right: PositionConfig.paddingWithAddLabel,
      };
    },
  },
  getLines(transition) {
    const { transform } = transition;
    const lines: FlowTransitionLine[] = [];
    if (transform.firstChild) {
      lines.push({
        type: FlowTransitionLineEnum.STRAIGHT_LINE,
        from: transform.inputPoint,
        to: transform.firstChild.inputPoint,
      });
    }
    if (transform.next) {
      lines.push({
        type: FlowTransitionLineEnum.STRAIGHT_LINE,
        from: transform.outputPoint,
        to: transform.next.inputPoint,
      });
    } else {
      lines.push({
        type: FlowTransitionLineEnum.STRAIGHT_LINE,
        from: transform.outputPoint,
        to: transform.parent!.outputPoint,
      });
    }
    return lines;
  },
  getDelta(transform: FlowNodeTransformData): IPoint | undefined {
    const groupController = FlowGroupController.create(transform.entity);
    if (!groupController || groupController.collapsed) {
      return;
    }
    if (transform.entity.isVertical) {
      return {
        x: 0,
        y: PositionConfig.paddingWithNote,
      };
    }
    return {
      x: PositionConfig.padding,
      y: 0,
    };
  },
  getInputPoint(transform: FlowNodeTransformData): IPoint {
    const child = transform.firstChild;
    if (!child) return transform.defaultInputPoint;
    if (transform.entity.isVertical) {
      return {
        x: child.inputPoint.x,
        y: transform.bounds.topCenter.y,
      };
    }
    return {
      x: transform.bounds.leftCenter.x,
      y: child.inputPoint.y,
    };
  },
  getOutputPoint(transform: FlowNodeTransformData): IPoint {
    const child = transform.lastChild;
    if (!child) return transform.defaultOutputPoint;
    if (transform.entity.isVertical) {
      return {
        x: child.outputPoint.x,
        y: child.outputPoint.y + PositionConfig.paddingWithAddLabel / 2,
      };
    }
    return {
      x: child.outputPoint.x + PositionConfig.paddingWithAddLabel / 2,
      y: child.outputPoint.y,
    };
  },
  getLabels(transition) {
    const { transform } = transition;
    if (transform.next) {
      if (transform.entity.isVertical) {
        return [
          {
            offset: Point.getMiddlePoint(
              Point.move(transform.outputPoint, {
                x: 0,
                y: PositionConfig.paddingWithAddLabel / 2,
              }),
              transform.next.inputPoint
            ),
            type: FlowTransitionLabelEnum.ADDER_LABEL,
          },
        ];
      }
      return [
        {
          offset: Point.getMiddlePoint(
            Point.move(transform.outputPoint, { x: PositionConfig.paddingWithAddLabel / 2, y: 0 }),
            transform.next.inputPoint
          ),
          type: FlowTransitionLabelEnum.ADDER_LABEL,
        },
      ];
    }
    return [
      {
        offset: transform.parent!.outputPoint,
        type: FlowTransitionLabelEnum.ADDER_LABEL,
      },
    ];
  },
  getOriginDeltaY(transform): number {
    const { children } = transform;
    if (children.length === 0) {
      return -transform.size.height * transform.origin.y;
    }
    // 这里要加上 y 轴的偏移
    return -transform.size.height * transform.origin.y - PositionConfig.paddingWithNote;
  },
};
