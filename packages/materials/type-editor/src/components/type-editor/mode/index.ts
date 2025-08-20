/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { IJsonSchema } from '@flowgram.ai/json-schema';

import { type ModeValueConfig, type TypeEditorMode } from '../type';
import { typeDefinitionConfig } from './type-definition';
import { declareAssignConfig } from './declare-assign';

export const modeValueConfig: ModeValueConfig<TypeEditorMode, IJsonSchema>[] = [
  declareAssignConfig,
  typeDefinitionConfig,
];
