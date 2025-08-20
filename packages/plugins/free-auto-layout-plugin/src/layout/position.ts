/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { WorkflowDocument } from '@flowgram.ai/free-layout-core';
import { PositionSchema, startTween, TransformData } from '@flowgram.ai/core';

import { LayoutNode } from './type';
import { LayoutStore } from './store';

export class LayoutPosition {
  constructor(private readonly store: LayoutStore) {}

  public async position(): Promise<void> {
    if (this.store.options.enableAnimation) {
      return this.positionWithAnimation();
    }
    return this.positionDirectly();
  }

  private positionDirectly(): void {
    this.store.nodes.forEach((layoutNode) => {
      this.updateNodePosition({ layoutNode, step: 100 });
    });
  }

  private async positionWithAnimation(): Promise<void> {
    return new Promise((resolve) => {
      startTween({
        from: { d: 0 },
        to: { d: 100 },
        duration: 300,
        onUpdate: (v) => {
          this.store.nodes.forEach((layoutNode) => {
            this.updateNodePosition({ layoutNode, step: v.d });
          });
        },
        onComplete: () => {
          resolve();
        },
      });
    });
  }

  private updateNodePosition(params: { layoutNode: LayoutNode; step: number }): void {
    const { layoutNode, step } = params;
    const transform = layoutNode.entity.getData(TransformData);
    const position: PositionSchema = {
      x: layoutNode.position.x + layoutNode.offset.x,
      y: layoutNode.position.y + layoutNode.offset.y,
    };
    const deltaX = ((position.x - transform.position.x) * step) / 100;
    const deltaY = ((position.y - transform.bounds.height / 2 - transform.position.y) * step) / 100;

    transform.update({
      position: {
        x: transform.position.x + deltaX,
        y: transform.position.y + deltaY,
      },
    });
    const document = layoutNode.entity.document as WorkflowDocument;
    document.layout.updateAffectedTransform(layoutNode.entity);
  }
}
