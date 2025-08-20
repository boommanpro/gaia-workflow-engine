/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

export type ContainerService = any;

export interface IContainer {
  get<T = ContainerService>(key: any): T;
}
