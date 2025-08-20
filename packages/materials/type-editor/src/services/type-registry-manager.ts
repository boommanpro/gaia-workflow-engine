/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { JsonSchemaTypeManager, IJsonSchema } from '@flowgram.ai/json-schema';

import { TypeEditorRegistry } from '../types';

export class TypeEditorRegistryManager<
  TypeSchema extends Partial<IJsonSchema>
> extends JsonSchemaTypeManager<TypeSchema, TypeEditorRegistry<TypeSchema>> {}
