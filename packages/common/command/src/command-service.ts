/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { type Disposable, type Event } from '@flowgram.ai/utils';

import { type CommandEvent } from './command';

export const CommandService = Symbol('CommandService');

/**
 * command service 执行接口
 */
export interface CommandService extends Disposable {
  /**
   * command 事件执行前触发事件
   */
  readonly onWillExecuteCommand: Event<CommandEvent>;
  /**
   * command 事件执行完成后触发
   */
  readonly onDidExecuteCommand: Event<CommandEvent>;

  /**
   * 执行 command
   */
  executeCommand<T>(command: string, ...args: any[]): Promise<T | undefined>;
}
