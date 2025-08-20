/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { FlowDocument } from '@flowgram.ai/document';

import { IGroupPluginRegister } from '../type';
import { GroupRegister } from '../group-node-register';

/** 注册分组节点 */
export const registerGroupNode: IGroupPluginRegister = ctx => {
  const document = ctx.get<FlowDocument>(FlowDocument);
  document.registerFlowNodes(GroupRegister);
};
