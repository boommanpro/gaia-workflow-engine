/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

export interface ICache<K = string, V = any> {
  init(): void;
  dispose(): void;
  get(key: K): V;
  set(key: K, value: V): this;
  delete(key: K): boolean;
  has(key: K): boolean;
}
