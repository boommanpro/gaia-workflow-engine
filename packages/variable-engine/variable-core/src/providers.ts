/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { interfaces } from 'inversify';

import { type VariableEngine } from './variable-engine';

// 动态获取 variableEngine，防止出现引用 variableEngine 导致的循环依赖
export const VariableEngineProvider = Symbol('DynamicVariableEngine');
export type VariableEngineProvider = () => VariableEngine;

export const ContainerProvider = Symbol('ContainerProvider');
export type ContainerProvider = () => interfaces.Container;
