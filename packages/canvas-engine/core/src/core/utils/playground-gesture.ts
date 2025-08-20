/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { Disposable, DisposableImpl } from '@flowgram.ai/utils';

import { type PlaygroundConfigEntity } from '../layer/config/playground-config-entity';
import { Gesture } from './use-gesture';

/* istanbul ignore next */
export class PlaygroundGesture extends DisposableImpl {
  private _pinching = false;

  constructor(
    public readonly target: HTMLElement,
    protected readonly config: PlaygroundConfigEntity
  ) {
    super();
    this.preventDefault();
    const gesture = new Gesture(
      target,
      {
        // onDrag: ({pinching, cancel, offset: [x, y], ...rest}) => {
        //   if (pinching) return cancel();
        //   onChange({ ...style, x, y })
        //   api.start({ x, y })
        // },
        onPinch: ({
          origin: [originX, originY],
          first,
          last,
          movement: [ms],
          offset: [newScale, a],
        }) => {
          this.handlePinch({ first, last, originX, originY, newScale });
        },
      },
      {
        // drag: { from: () => [startState.x, startState.y] },
        pinch: {
          scaleBounds: () => this.getScaleBounds(),
          from: () => [this.config.finalScale, 0],
          /**
           * 支持 command 和 ctrl
           */
          modifierKey: ['metaKey', 'ctrlKey'],
          // rubberband: true
        },
      }
    );
    this.toDispose.push(
      Disposable.create(() => {
        gesture.destroy();
      })
    );
  }

  handlePinch(params: {
    first: boolean;
    last: boolean;
    originX: number;
    originY: number;
    newScale: number;
  }) {
    const { first, last, originX, originY, newScale } = params;
    if (Number.isNaN(params.newScale)) {
      // 防止画布无法缩放
      return;
    }
    if (first) {
      this._pinching = true;
    }
    if (last) {
      this._pinching = false;
    }
    const oldScale = this.config.finalScale;
    const origin = this.config.getPosFromMouseEvent({ clientX: originX, clientY: originY }, false);
    // 放大后的位置
    const finalPos = {
      x: (origin.x / oldScale) * newScale,
      y: (origin.y / oldScale) * newScale,
    };
    this.config.updateConfig({
      scrollX: this.config.config.scrollX + finalPos.x - origin.x,
      scrollY: this.config.config.scrollY + finalPos.y - origin.y,
      zoom: newScale,
    });
  }

  getScaleBounds(): { min: number; max: number } {
    return {
      min: this.config.config.minZoom,
      max: this.config.config.maxZoom,
    };
  }

  protected preventDefault(): void {
    // 阻止默认手势
    const handler = (e: MouseEvent) => e.preventDefault();
    // @ts-ignore
    document.addEventListener('gesturestart', handler);
    // @ts-ignore
    document.addEventListener('gesturechange', handler);
    this.toDispose.push(
      Disposable.create(() => {
        // @ts-ignore
        document.removeEventListener('gesturestart', handler);
        // @ts-ignore
        document.removeEventListener('gesturechange', handler);
      })
    );
  }

  get pinching(): boolean {
    return this._pinching;
  }
}
