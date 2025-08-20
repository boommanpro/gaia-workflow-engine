/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

// import { TypeDefinitionRegistryCreator } from '@flow-ide-editor/flow-schema-type-definitions';

import { JsonSchemaTypeRegistryCreator } from '@flowgram.ai/json-schema';

import { stringRegistryCreator } from './string';
import { objectRegistryCreator } from './object';
import { numberRegistryCreator } from './number';
import { integerRegistryCreator } from './integer';
import { booleanRegistryCreator } from './boolean';
import { arrayRegistryCreator } from './array';

export const defaultTypeRegistryCreators: JsonSchemaTypeRegistryCreator[] = [
  stringRegistryCreator,
  numberRegistryCreator,
  integerRegistryCreator,
  booleanRegistryCreator,
  objectRegistryCreator,
  arrayRegistryCreator,
];
