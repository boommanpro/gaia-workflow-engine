/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { Tracker } from './tracker';

type IStateEqual = (a: any, b: any) => boolean;

export class ReactiveBaseState<V> {
  protected _dep = new Tracker.Dependency();

  protected _value: V;

  protected _isEqual: IStateEqual = (a: any, b: any) => a == b;

  protected _addDepend(dep: Tracker.Dependency): void {
    if (Tracker.isActive()) {
      dep.depend();
    }
  }

  constructor(initialValue: V, opts?: { isEqual?: IStateEqual }) {
    this._value = initialValue;
    if (opts?.isEqual) {
      this._isEqual = opts.isEqual;
    }
  }

  hasDependents(): boolean {
    return this._dep.hasDependents();
  }

  get value(): V {
    this._addDepend(this._dep);
    return this._value;
  }

  set value(newValue: V) {
    if (!this._isEqual(this._value, newValue)) {
      this._value = newValue;
      this._dep.changed();
    }
  }
}
