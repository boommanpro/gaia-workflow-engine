/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { FlowDocument } from '@flowgram.ai/document';
import { FlowGroupService } from '@flowgram.ai/document';

import { IGroupPluginRegister } from '../type';

/** 注册清理分组逻辑 */
export const registerCleanGroups: IGroupPluginRegister = (ctx, opts) => {
  const groupService = ctx.get<FlowGroupService>(FlowGroupService);
  const document = ctx.get<FlowDocument>(FlowDocument);

  const clearInvalidGroups = () => {
    groupService.getAllGroups().forEach(group => {
      if (group?.nodes.length !== 0) {
        return;
      }
      if (!group.groupNode.pre) {
        return;
      }
      groupService.deleteGroup(group.groupNode);
    });
  };

  document.originTree.onTreeChange(() => {
    setTimeout(() => {
      clearInvalidGroups();
    }, 0);
  });
};
