/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { Tracker } from './tracker';

import Dependency = Tracker.Dependency;

import { ReactiveBaseState } from './reactive-base-state';
import { createProxy } from '../utils/create-proxy';

export class ReactiveState<V extends Record<string, any>> extends ReactiveBaseState<V> {
  private _keyDeps: Map<string, Dependency> = new Map();

  set<K extends keyof V & string>(key: K, value: V[K]): boolean {
    this._ensureKey(key);
    const oldValue = this._value[key];
    if (!this._isEqual(oldValue, value)) {
      this._value[key] = value;
      this._keyDeps.get(key)!.changed();
      return true;
    }
    return false;
  }

  get<K extends keyof V & string>(key: K): V[K] {
    this._ensureKey(key);
    this._addDepend(this._keyDeps.get(key)!);
    return this._value[key];
  }

  protected _ensureKey(key: keyof V & string) {
    if (!this._keyDeps.has(key)) {
      this._keyDeps.set(key, new Dependency());
    }
  }

  hasDependents(): boolean {
    if (this._dep.hasDependents()) return true;
    for (const dep of this._keyDeps.values()) {
      if (dep.hasDependents()) return true;
    }
    return false;
  }

  keys(): string[] {
    return Object.keys(this._value);
  }

  set value(newValue: V) {
    if (!this._isEqual(this._value, newValue)) {
      this._value = newValue;
      this._keyDeps.clear();
      this._dep.changed();
    }
  }

  private _proxyValue: V;

  get value(): V {
    this._addDepend(this._dep);
    if (!this._proxyValue) {
      this._proxyValue = createProxy<V>(this._value, {
        get: (target, key: string) => this.get(key),
        set: (target, key: string, newValue) => {
          this.set(key, newValue);
          return true;
        },
      });
    }
    return this._proxyValue;
  }

  private _proxyReadonlyValue: V;

  get readonlyValue(): Readonly<V> {
    this._addDepend(this._dep);
    if (!this._proxyReadonlyValue) {
      this._proxyReadonlyValue = createProxy(this._value, {
        get: (target, key: string) => this.get(key),
        set: (newValue, key: string) => {
          throw new Error(`[ReactiveState] Cannnot set readonly field "${key}"`);
        },
      });
    }
    return this._proxyReadonlyValue;
  }
}
