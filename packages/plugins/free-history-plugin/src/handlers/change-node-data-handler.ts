/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

/* eslint-disable @typescript-eslint/naming-convention */
import { cloneDeep, get, isEqual, set } from 'lodash';
import { injectable, inject } from 'inversify';
import { FlowNodeFormData, type DetailChangeEvent } from '@flowgram.ai/form-core';
import { type FlowNodeEntity } from '@flowgram.ai/document';
import { WorkflowDocument } from '@flowgram.ai/free-layout-core';
import { HistoryService } from '@flowgram.ai/history';

import { FreeOperationType, type IHandler } from '../types';
import { HistoryEntityManager } from '../history-entity-manager';
import { FreeHistoryConfig } from '../free-history-config';

export interface ChangeNodeDataEvent extends DetailChangeEvent {
  node: FlowNodeEntity;
}

@injectable()
export class ChangeNodeDataHandler implements IHandler<ChangeNodeDataEvent> {
  @inject(HistoryService)
  private _historyService: HistoryService;

  @inject(WorkflowDocument) document: WorkflowDocument;

  @inject(HistoryEntityManager)
  private _entityManager: HistoryEntityManager;

  @inject(FreeHistoryConfig)
  private _config: FreeHistoryConfig;

  handle(event: ChangeNodeDataEvent) {
    const { path, value, initialized, node } = event;
    const formData = node.getData<FlowNodeFormData>(FlowNodeFormData);
    const oldValue = this._entityManager.getValue(formData) as object;
    const propPath = path.split('/').filter(Boolean).join('.');

    const propOldValue = propPath ? get(oldValue, propPath) : oldValue;
    if (isEqual(value, propOldValue)) {
      return;
    }

    if (initialized) {
      let operationPath = path;
      let operationValue = cloneDeep(value);
      let operationOldValue = propOldValue;
      // 只存储一层的数据，因为formModel无法获取数组下的某项的值
      if (path !== '/') {
        const clonedOldValue = cloneDeep(oldValue);
        set(clonedOldValue, propPath, value);
        operationPath = path.split('/').filter(Boolean)[0];
        operationValue = get(clonedOldValue, operationPath);
        operationOldValue = get(oldValue, operationPath);
      }

      this._historyService.pushOperation(
        {
          type: FreeOperationType.changeNodeData,
          value: {
            id: node.id,
            path: operationPath,
            value: operationValue,
            oldValue: operationOldValue,
          },
          uri: this._config.getNodeURI(node.id),
        },
        { noApply: true },
      );
    }

    if (propPath) {
      set(oldValue, propPath, cloneDeep(value));
    } else {
      this._entityManager.setValue(formData, cloneDeep(value));
    }
  }
}
