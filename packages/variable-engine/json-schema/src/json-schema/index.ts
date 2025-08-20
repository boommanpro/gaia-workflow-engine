/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { JsonSchemaTypeManager } from './json-schema-type-manager';

export {
  JsonSchemaBasicType,
  IJsonSchema,
  IBasicJsonSchema,
  JsonSchemaTypeRegistry,
  JsonSchemaTypeRegistryCreator,
} from './types';
export { JsonSchemaUtils } from './utils';
export { JsonSchemaTypeManager } from './json-schema-type-manager';

// Global JsonSchemaTypeManager
export const jsonSchemaTypeManager = new JsonSchemaTypeManager();
