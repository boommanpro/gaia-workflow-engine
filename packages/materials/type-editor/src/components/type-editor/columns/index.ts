/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { valueColumnConfig } from './value';
import { typeColumnConfig } from './type';
import { requiredColumnConfig } from './required';
import { privateColumnConfig } from './private';
import { operateColumnConfig } from './operate';
import { keyColumnConfig } from './key';
import { descriptionColumnConfig } from './description';
import { defaultColumnConfig } from './default';

export const columnConfigs = [
  keyColumnConfig,
  typeColumnConfig,
  requiredColumnConfig,
  descriptionColumnConfig,
  privateColumnConfig,
  valueColumnConfig,
  defaultColumnConfig,
  operateColumnConfig,
];
