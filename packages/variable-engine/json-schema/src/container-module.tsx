/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { ContainerModule } from 'inversify';

import { JsonSchemaTypeManager } from './json-schema';
import { BaseTypeManager } from './base';

export const TypeManager = Symbol('TypeManager');

export const jsonSchemaContainerModule = new ContainerModule((bind) => {
  bind(BaseTypeManager).to(JsonSchemaTypeManager).inSingletonScope();
});
