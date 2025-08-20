/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { IPoint, Point } from '@flowgram.ai/utils';
import {
  type FlowNodeTransitionData,
  FlowTransitionLineEnum,
  FlowTransitionLabelEnum,
  type FlowNodeTransformData,
  type FlowTransitionLine,
  type FlowTransitionLabel,
  getDefaultSpacing,
} from '@flowgram.ai/document';

import { RENDER_SLOT_COLLAPSE_KEY, SlotSpacingKey, SLOT_START_DISTANCE } from '../constants';
import { getDisplayFirstChildTransform } from './node';

/**
 * 画 Slot 节点虚线起点
 * @param iconTransform blockIcon 的 transform
 * @returns
 */
export const getSlotChildLineStartPoint = (iconTransform?: FlowNodeTransformData): IPoint => {
  if (!iconTransform) {
    return { x: 0, y: 0 };
  }

  const startDistance = getDefaultSpacing(
    iconTransform.entity,
    SlotSpacingKey.SLOT_START_DISTANCE,
    SLOT_START_DISTANCE
  );

  if (!iconTransform.entity.isVertical) {
    return {
      x: iconTransform?.bounds.center.x,
      y: iconTransform?.bounds.bottom + startDistance,
    };
  }
  return {
    x: iconTransform?.bounds.right + startDistance,
    y: iconTransform?.bounds.center.y,
  };
};

export const getOutputPoint = (transform: FlowNodeTransformData): IPoint => {
  const icon = transform.firstChild;

  if (!icon) {
    return { x: 0, y: 0 };
  }

  if (!transform.entity.isVertical) {
    return {
      x: transform.bounds.right,
      y: icon.outputPoint.y,
    };
  }

  return {
    x: icon.outputPoint.x,
    y: transform.bounds.bottom,
  };
};

export const getInputPoint = (transform: FlowNodeTransformData): IPoint => {
  const icon = transform.firstChild;

  if (!icon) {
    return { x: 0, y: 0 };
  }

  if (!transform.entity.isVertical) {
    return {
      x: transform.bounds.left,
      y: icon.outputPoint.y,
    };
  }

  return icon.inputPoint;
};

/**
 * 获取实连线终点
 * @param transition
 * @returns
 */
export const getTransitionToPoint = (transition: FlowNodeTransitionData): IPoint => {
  let toPoint = transition.transform.next?.inputPoint;
  const icon = transition.transform.firstChild;

  const parent = transition.transform.parent;

  if (!icon || !parent) {
    return { x: 0, y: 0 };
  }

  if (!transition.transform.next) {
    if (!transition.entity.isVertical) {
      toPoint = {
        x: parent.outputPoint.x,
        y: icon.outputPoint.y,
      };
    } else {
      toPoint = {
        x: icon.outputPoint.x,
        y: parent.outputPoint.y,
      };
    }
  }

  return toPoint || { x: 0, y: 0 };
};

/**
 * 画实现线
 * @param transition Slot 节点的 transition
 * @returns
 */
export const drawStraightLine = (transition: FlowNodeTransitionData): FlowTransitionLine[] => {
  const icon = transition.transform.firstChild;
  const toPoint = getTransitionToPoint(transition);

  if (!icon) {
    return [];
  }

  return [
    {
      type: FlowTransitionLineEnum.STRAIGHT_LINE,
      from: icon.outputPoint,
      to: toPoint,
    },
    {
      type: FlowTransitionLineEnum.STRAIGHT_LINE,
      from: icon.inputPoint,
      to: transition.transform.inputPoint,
    },
  ];
};

export const drawCollapseLabel = (transition: FlowNodeTransitionData): FlowTransitionLabel[] => {
  const icon = transition.transform;

  return [
    {
      type: FlowTransitionLabelEnum.CUSTOM_LABEL,
      renderKey: RENDER_SLOT_COLLAPSE_KEY,
      offset: getSlotChildLineStartPoint(icon),
      props: {
        node: transition.entity.parent,
      },
    },
  ];
};

export const drawCollapseLine = (transition: FlowNodeTransitionData): FlowTransitionLine[] => {
  const startDistance = getDefaultSpacing(
    transition.transform.entity,
    SlotSpacingKey.SLOT_START_DISTANCE,
    SLOT_START_DISTANCE
  );

  return [
    {
      type: FlowTransitionLineEnum.STRAIGHT_LINE,
      from: getSlotChildLineStartPoint(transition.transform),
      to: Point.move(
        getSlotChildLineStartPoint(transition.transform),
        transition.entity.isVertical ? { x: -startDistance, y: 0 } : { x: 0, y: -startDistance }
      ),
      style: {
        strokeDasharray: '5 5',
      },
    },
  ];
};

/**
 * 画实线上的叫号
 * @param transition
 * @returns
 */
export const drawStraightAdder = (transition: FlowNodeTransitionData): FlowTransitionLabel[] => {
  const toPoint = getTransitionToPoint(transition);
  const fromPoint = transition.transform.firstChild!.outputPoint;

  const hoverProps = transition.entity.isVertical
    ? {
        hoverHeight: toPoint.y - fromPoint.y,
        hoverWidth: transition.transform.firstChild?.bounds.width,
      }
    : {
        hoverHeight: transition.transform.firstChild?.bounds.height,
        hoverWidth: toPoint.x - fromPoint.x,
      };

  return [
    {
      offset: Point.getMiddlePoint(fromPoint, toPoint),
      type: FlowTransitionLabelEnum.ADDER_LABEL,
      props: hoverProps,
    },
  ];
};

/**
 * 获取端口的子节点线条输入点
 * @param _child
 * @returns
 */
export const getPortChildInput = (_child?: FlowNodeTransformData) => {
  if (!_child) {
    return { x: 0, y: 0 };
  }

  const firstChild = getDisplayFirstChildTransform(_child);

  return { x: _child.bounds.left, y: firstChild.bounds.center.y };
};
