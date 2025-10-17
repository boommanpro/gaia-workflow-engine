/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import {
  BaseTypeManager,
  jsonSchemaContainerModule,
  JsonSchemaTypeManager,
} from '@flowgram.ai/json-schema';
import { definePluginCreator } from '@flowgram.ai/editor';

import { JsonSchemaTypeRegistry } from './types';
import { initRegistries, jsonSchemaTypePreset } from './type-definition';

initRegistries();

export const createTypePresetPlugin = definePluginCreator<{
  types?: Partial<JsonSchemaTypeRegistry> & Pick<JsonSchemaTypeRegistry, 'type'>[];
  unregisterTypes?: string[];
}>({
  onInit(ctx, opts) {
    const typeManager = ctx.get(BaseTypeManager) as JsonSchemaTypeManager;
    jsonSchemaTypePreset.forEach((_type) => typeManager.register(_type));

    opts.types?.forEach((_type) => typeManager.register(_type));
    opts.unregisterTypes?.forEach((_type) => typeManager.unregister(_type));
  },
  containerModules: [jsonSchemaContainerModule],
});
