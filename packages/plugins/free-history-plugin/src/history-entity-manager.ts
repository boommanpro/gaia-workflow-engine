/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

/* eslint-disable @typescript-eslint/naming-convention */
import { cloneDeep, isEqual } from 'lodash-es';
import { injectable } from 'inversify';
import { type Disposable, DisposableCollection } from '@flowgram.ai/utils';
import { type EntityData } from '@flowgram.ai/core';

@injectable()
export class HistoryEntityManager implements Disposable {
  private _entityDataValues: Map<EntityData, unknown> = new Map();

  private _toDispose: DisposableCollection = new DisposableCollection();

  addEntityData(entityData: EntityData) {
    this._entityDataValues.set(entityData, cloneDeep(entityData.toJSON()));
    this._toDispose.push(
      entityData.onWillChange((event) => {
        const value = event.toJSON();
        const oldValue = this._entityDataValues.get(entityData);
        if (isEqual(value, oldValue)) {
          return;
        }
        this._entityDataValues.set(entityData, cloneDeep(value));
      })
    );
  }

  getValue(entityData: EntityData) {
    return this._entityDataValues.get(entityData);
  }

  setValue(entityData: EntityData, value: unknown) {
    return this._entityDataValues.set(entityData, value);
  }

  dispose() {
    this._entityDataValues.clear();
    this._toDispose.dispose();
  }
}
