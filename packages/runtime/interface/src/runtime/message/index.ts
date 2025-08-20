/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

export enum WorkflowMessageType {
  Log = 'log',
  Info = 'info',
  Debug = 'debug',
  Error = 'error',
  Warn = 'warning',
}

export interface MessageData {
  message: string;
  nodeID?: string;
  timestamp?: number;
}

export interface IMessage extends MessageData {
  id: string;
  type: WorkflowMessageType;
  timestamp: number;
}

export type WorkflowMessages = Record<WorkflowMessageType, IMessage[]>;

export interface IMessageCenter {
  init(): void;
  dispose(): void;
  log(data: MessageData): IMessage;
  info(data: MessageData): IMessage;
  debug(data: MessageData): IMessage;
  error(data: MessageData): IMessage;
  warn(data: MessageData): IMessage;
  export(): WorkflowMessages;
}
