/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { inject, injectable } from 'inversify';
import {
  FlowGroupService,
  FlowNodeEntity,
  FlowNodeEntityOrId,
  FlowNodeFormData,
  FlowOperationBaseServiceImpl,
  FormModel,
  FormModelV2,
  isFormModelV2,
} from '@flowgram.ai/editor';

import { FlowOperationService } from '../types';

@injectable()
export class FlowOperationServiceImpl
  extends FlowOperationBaseServiceImpl
  implements FlowOperationService
{
  @inject(FlowGroupService)
  protected groupService: FlowGroupService;

  createGroup(nodes: FlowNodeEntity[]): FlowNodeEntity | undefined {
    return this.groupService.createGroup(nodes);
  }

  ungroup(groupNode: FlowNodeEntity): void {
    return this.groupService.ungroup(groupNode);
  }

  setFormValue(nodeOrId: FlowNodeEntityOrId, path: string, value: unknown): void {
    const node = this.toNodeEntity(nodeOrId);
    const formModel = node?.getData(FlowNodeFormData)?.getFormModel<FormModel | FormModelV2>();

    if (!formModel) {
      return;
    }

    if (isFormModelV2(formModel)) {
      (formModel as FormModelV2).setValueIn(path, value);
    } else {
      const formItem = (formModel as FormModel).getFormItemByPath(path);

      if (!formItem) {
        return;
      }
      formItem.value = value;
    }
  }

  startTransaction(): void {}

  endTransaction(): void {}
}
