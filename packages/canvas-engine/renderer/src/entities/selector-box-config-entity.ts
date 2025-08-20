/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import {
  PositionSchema,
  SizeSchema,
  ConfigEntity,
  PlaygroundDragEvent,
} from '@flowgram.ai/core';
import { Rectangle } from '@flowgram.ai/utils';

export interface SelectorBoxConfigData extends PlaygroundDragEvent {
  disabled?: boolean; // 是否禁用选择框
}

/**
 * 选择框配置
 */
export class SelectorBoxConfigEntity extends ConfigEntity<SelectorBoxConfigData> {
  static type = 'SelectorBoxConfigEntity';

  get dragInfo(): PlaygroundDragEvent {
    return this.config;
  }

  setDragInfo(info: PlaygroundDragEvent): void {
    this.updateConfig(info);
  }

  get disabled(): boolean {
    return this.config && !!this.config.disabled;
  }

  set disabled(disabled: boolean) {
    this.updateConfig({
      disabled,
    });
  }

  get isStart(): boolean {
    return this.dragInfo.isStart;
  }

  get isMoving(): boolean {
    return this.dragInfo.isMoving;
  }

  get position(): PositionSchema {
    const { dragInfo } = this;
    return {
      x: dragInfo.startPos.x < dragInfo.endPos.x ? dragInfo.startPos.x : dragInfo.endPos.x,
      y: dragInfo.startPos.y < dragInfo.endPos.y ? dragInfo.startPos.y : dragInfo.endPos.y,
    };
  }

  get size(): SizeSchema {
    const { dragInfo } = this;
    return {
      width: Math.abs(dragInfo.startPos.x - dragInfo.endPos.x),
      height: Math.abs(dragInfo.startPos.y - dragInfo.endPos.y),
    };
  }

  get collapsed(): boolean {
    const { size } = this;
    return size.width === 0 && size.height === 0;
  }

  collapse(): void {
    this.setDragInfo({
      ...this.dragInfo,
      isMoving: false,
      isStart: false,
    });
  }

  toRectangle(scale: number): Rectangle {
    const { position, size } = this;
    return new Rectangle(
      position.x / scale,
      position.y / scale,
      size.width / scale,
      size.height / scale,
    );
  }
}
