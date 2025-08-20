/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { IMessage, MessageData, WorkflowMessageType } from '@flowgram.ai/runtime-interface';

import { uuid } from '@infra/utils';

export namespace WorkflowRuntimeMessage {
  export const create = (
    params: MessageData & {
      type: WorkflowMessageType;
    }
  ): IMessage => {
    const message = {
      id: uuid(),
      ...params,
    };
    if (!params.timestamp) {
      message.timestamp = Date.now();
    }
    return message as IMessage;
  };
}
