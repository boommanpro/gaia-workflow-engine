/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

export class TimeoutStore {
  private _timeouts = new Map<string, number>();

  add<FunctionType extends (...args: any[]) => any>(
    key: string,
    callback: FunctionType,
    ms = 140,
    ...args: Parameters<FunctionType>
  ) {
    this.remove(key);
    this._timeouts.set(key, window.setTimeout(callback, ms, ...args));
  }

  remove(key: string) {
    const timeout = this._timeouts.get(key);
    if (timeout) window.clearTimeout(timeout);
  }

  clean() {
    this._timeouts.forEach(timeout => void window.clearTimeout(timeout));
    this._timeouts.clear();
  }
}
