/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { Point } from '@flowgram.ai/utils';
import { EntityData } from '@flowgram.ai/core';

import {
  type FlowTransitionLabel,
  FlowTransitionLabelEnum,
  type FlowTransitionLine,
  FlowTransitionLineEnum,
} from '../typings';
import { type FlowNodeEntity } from '../entities';
import { FlowNodeTransformData } from './flow-node-transform-data';
import { FlowNodeRenderData } from './flow-node-render-data';

export interface FlowNodeTransitionSchema {}

// 画线到下一个节点
export const drawLineToNext = (transition: FlowNodeTransitionData) => {
  const { transform } = transition;

  // 默认绘制一根连接到下一个节点的线条
  const currentOutput = transform.outputPoint;
  if (transform.next) {
    return [
      {
        type: FlowTransitionLineEnum.STRAIGHT_LINE,
        from: currentOutput,
        to: transform.next.inputPoint,
      },
    ];
  }

  return [];
};

// 画线到父节点的结尾
export const drawLineToBottom = (transition: FlowNodeTransitionData) => {
  const { transform } = transition;

  const currentOutput = transform.outputPoint;
  const parentOutput = transform.parent?.outputPoint;
  if (
    !transform.next &&
    parentOutput &&
    !new Point().copyFrom(currentOutput).equals(parentOutput) &&
    !transition.isNodeEnd
  ) {
    return [
      {
        type: FlowTransitionLineEnum.STRAIGHT_LINE,
        from: currentOutput,
        to: parentOutput,
      },
    ];
  }

  return [];
};

export class FlowNodeTransitionData extends EntityData<FlowNodeTransitionSchema> {
  static type = 'FlowNodeTransitionData';

  declare entity: FlowNodeEntity;

  // 当前节点的 transform
  declare transform: FlowNodeTransformData;

  declare renderData: FlowNodeRenderData;

  getDefaultData(): FlowNodeTransitionSchema {
    return {};
  }

  formatLines(lines: FlowTransitionLine[]) {
    if (this.entity.document.options?.formatNodeLines) {
      return this.entity.document.options?.formatNodeLines?.(this.entity, lines);
    }
    return lines;
  }

  formatLabels(labels: FlowTransitionLabel[]) {
    if (this.entity.document.options.formatNodeLabels) {
      return this.entity.document.options?.formatNodeLabels?.(this.entity, labels);
    }
    return labels;
  }

  get lines(): FlowTransitionLine[] {
    return this.entity.memoGlobal<FlowTransitionLine[]>('lines', () => {
      const { getChildLines } = this.entity.parent?.getNodeRegistry() || {};

      if (getChildLines) {
        return this.formatLines(getChildLines(this, this.entity.document.layout));
      }

      const { getLines } = this.entity.getNodeRegistry();

      if (getLines) {
        return this.formatLines(getLines(this, this.entity.document.layout));
      }

      // 横向布局不画线
      if (this.transform.entity.isInlineBlock) {
        return [];
      }

      return this.formatLines([...drawLineToNext(this), ...drawLineToBottom(this)]);
    });
  }

  get labels() {
    return this.entity.memoGlobal<FlowTransitionLabel[]>('labels', () => {
      const { getChildLabels } = this.entity.parent?.getNodeRegistry() || {};

      if (getChildLabels) {
        return this.formatLabels(getChildLabels(this, this.entity.document.layout));
      }

      const { getLabels } = this.entity.getNodeRegistry();

      if (getLabels) {
        return this.formatLabels(getLabels(this, this.entity.document.layout));
      }

      // 横向布局不画加号
      if (this.transform.entity.isInlineBlock) {
        return [];
      }

      // 默认在中间点添加一个加号
      const currentOutput = this.transform.outputPoint;
      if (this.transform.next) {
        return this.formatLabels([
          {
            offset: Point.getMiddlePoint(currentOutput, this.transform.next.inputPoint),
            type: FlowTransitionLabelEnum.ADDER_LABEL,
          },
        ]);
      }

      const parentOutput = this.transform.parent?.outputPoint;
      if (
        parentOutput &&
        !new Point().copyFrom(currentOutput).equals(parentOutput) &&
        !this.isNodeEnd
      ) {
        return this.formatLabels([
          {
            offset: parentOutput,
            type: FlowTransitionLabelEnum.ADDER_LABEL,
          },
        ]);
      }

      return [];
    });
  }

  constructor(entity: FlowNodeEntity) {
    super(entity);
    this.transform = this.entity.addData<FlowNodeTransformData>(FlowNodeTransformData);
    this.renderData = this.entity.addData<FlowNodeRenderData>(FlowNodeRenderData);

    this.bindChange(this.transform);
    this.bindChange(this.renderData);
  }

  get collapsed() {
    return this.entity.collapsed;
  }

  get isNodeEnd(): boolean {
    return this.entity.isNodeEnd;
  }
}
