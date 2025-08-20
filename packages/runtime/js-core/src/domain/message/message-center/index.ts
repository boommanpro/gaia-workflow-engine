/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import {
  IMessage,
  IMessageCenter,
  MessageData,
  WorkflowMessages,
  WorkflowMessageType,
} from '@flowgram.ai/runtime-interface';

import { WorkflowRuntimeMessage } from '../message-value-object';

export class WorkflowRuntimeMessageCenter implements IMessageCenter {
  private messages: WorkflowMessages;

  public init(): void {
    this.messages = {
      [WorkflowMessageType.Log]: [],
      [WorkflowMessageType.Info]: [],
      [WorkflowMessageType.Debug]: [],
      [WorkflowMessageType.Error]: [],
      [WorkflowMessageType.Warn]: [],
    };
  }

  public dispose(): void {}

  public log(data: MessageData): IMessage {
    const message = WorkflowRuntimeMessage.create({
      type: WorkflowMessageType.Log,
      ...data,
    });
    this.messages[WorkflowMessageType.Log].push(message);
    return message;
  }

  public info(data: MessageData): IMessage {
    const message = WorkflowRuntimeMessage.create({
      type: WorkflowMessageType.Info,
      ...data,
    });
    this.messages[WorkflowMessageType.Info].push(message);
    return message;
  }

  public debug(data: MessageData): IMessage {
    const message = WorkflowRuntimeMessage.create({
      type: WorkflowMessageType.Debug,
      ...data,
    });
    this.messages[WorkflowMessageType.Debug].push(message);
    return message;
  }

  public error(data: MessageData): IMessage {
    const message = WorkflowRuntimeMessage.create({
      type: WorkflowMessageType.Error,
      ...data,
    });
    this.messages[WorkflowMessageType.Error].push(message);
    return message;
  }

  public warn(data: MessageData): IMessage {
    const message = WorkflowRuntimeMessage.create({
      type: WorkflowMessageType.Warn,
      ...data,
    });
    this.messages[WorkflowMessageType.Warn].push(message);
    return message;
  }

  public export(): WorkflowMessages {
    return {
      [WorkflowMessageType.Log]: this.messages[WorkflowMessageType.Log].slice(),
      [WorkflowMessageType.Info]: this.messages[WorkflowMessageType.Info].slice(),
      [WorkflowMessageType.Debug]: this.messages[WorkflowMessageType.Debug].slice(),
      [WorkflowMessageType.Error]: this.messages[WorkflowMessageType.Error].slice(),
      [WorkflowMessageType.Warn]: this.messages[WorkflowMessageType.Warn].slice(),
    };
  }
}
