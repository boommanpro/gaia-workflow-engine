/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { bindConfigEntity } from '@flowgram.ai/core';
export { delay } from '@flowgram.ai/utils';

/**
 * 让 entity 可以注入到类中
 *
 * @example
 * ```
 *    class SomeClass {
 *      @inject(PlaygroundConfigEntity) playgroundConfig: PlaygroundConfigEntity
 *    }
 * ```
 * @param bind
 * @param entityRegistry
 */
export { bindConfigEntity };

export { buildGroupJSON } from './build-group-json';
export * from './nanoid';
export * from './compose';
export * from './fit-view';
export * from './get-anti-overlap-position';
export * from './statics';
