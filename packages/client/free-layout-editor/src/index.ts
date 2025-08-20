/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import 'reflect-metadata';

/* 核心 模块导出 */
export * from '@flowgram.ai/editor';

/**
 * 自由布局模块导出
 */
export * from '@flowgram.ai/free-layout-core';
export * from './components';
export * from './preset';
export * from './hooks';
export * from './tools';
export * from '@flowgram.ai/free-history-plugin';
export { useClientContext } from './hooks/use-client-context';
