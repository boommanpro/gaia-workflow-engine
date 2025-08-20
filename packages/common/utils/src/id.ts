/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

let _idx = 0;

export type LocalId = number;
export function generateLocalId(): LocalId {
  // @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/MAX_SAFE_INTEGER
  if (_idx === Number.MAX_SAFE_INTEGER) {
    _idx = 0;
  }
  return _idx++;
}

export function _setIdx(idx: number): void {
  _idx = idx;
}
