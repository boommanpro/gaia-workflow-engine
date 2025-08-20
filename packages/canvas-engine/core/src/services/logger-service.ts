/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { injectable } from 'inversify';
import { type Disposable, Emitter, type Event } from '@flowgram.ai/utils';

export interface LoggerProps {
  event: LoggerEvent;
  props?: Record<string, any>;
}

export enum LoggerEvent {
  CANVAS_TTI, // Time To Interactive，画布可交互时间
  CANVAS_FPS, // Frame Per Second，画布渲染帧率
}

/**
 * 画布全局的选择器，可以放任何东西
 */
@injectable()
export class LoggerService implements Disposable {
  protected readonly onLoggerEmitter = new Emitter<LoggerProps>();

  // plugin 内注册：loggerService.onLogger(() => {})
  readonly onLogger: Event<any> = this.onLoggerEmitter.event;

  onAllLayersRendered() {
    this.onLoggerEmitter.fire({
      event: LoggerEvent.CANVAS_TTI,
    });
  }

  onFlushRequest(renderFrameInterval: number) {
    if (renderFrameInterval <= 0) {
      return;
    }
    const fps = 1000 / renderFrameInterval;
    this.onLoggerEmitter.fire({
      event: LoggerEvent.CANVAS_FPS,
      props: { rfi: renderFrameInterval, fps },
    });
  }

  dispose() {
    this.onLoggerEmitter.dispose();
  }
}
