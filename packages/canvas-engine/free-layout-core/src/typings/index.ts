/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

export * from './workflow-json';
export * from './workflow-edge';
export * from './workflow-node';
export * from './workflow-registry';
export * from './workflow-line';
export * from './workflow-sub-canvas';
export * from './workflow-operation';
export * from './workflow-drag';

export const URLParams = Symbol('');

export interface URLParams {
  [key: string]: string;
}
