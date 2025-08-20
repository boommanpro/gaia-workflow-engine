/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { ShortcutsHandler } from '@flowgram.ai/shortcuts-plugin';
import { WorkflowSelectService } from '@flowgram.ai/free-layout-core';
import { PluginContext } from '@flowgram.ai/core';

import { WorkflowGroupService } from '../workflow-group-service';
import { WorkflowGroupCommand } from '../constant';

export class GroupShortcut implements ShortcutsHandler {
  public commandId = WorkflowGroupCommand.Group;

  public commandDetail: ShortcutsHandler['commandDetail'] = {
    label: 'Group',
  };

  public shortcuts = ['meta g', 'ctrl g'];

  private selectService: WorkflowSelectService;

  private groupService: WorkflowGroupService;

  constructor(context: PluginContext) {
    this.selectService = context.get(WorkflowSelectService);
    this.groupService = context.get(WorkflowGroupService);
    this.execute = this.execute.bind(this);
  }

  public async execute(): Promise<void> {
    this.groupService.createGroup(this.selectService.selectedNodes);
    this.selectService.clear();
  }
}
