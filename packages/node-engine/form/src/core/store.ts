/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { get, clone, cloneDeep } from 'lodash-es';

import { shallowSetIn } from '../utils';
import { FieldValue } from '../types/field';
import { Path } from './path';

export class Store<TValues = FieldValue> {
  protected _values: TValues;

  get values(): TValues {
    return clone(this._values);
  }

  set values(v) {
    this._values = cloneDeep(v);
  }

  setIn<TValue = FieldValue>(path: Path, value: TValue): void {
    // shallow clone set
    this._values = shallowSetIn(this._values || {}, path.toString(), value);
  }

  getIn<TValue = FieldValue>(path: Path): TValue {
    return get(this.values, path.value);
  }

  dispose() {}
}
