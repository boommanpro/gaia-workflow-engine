/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import React from 'react';

import { IJsonSchema, JsonSchemaTypeRegistryCreator } from '@flowgram.ai/json-schema';
import { Input } from '@douyinfe/semi-ui';

import { TypeInputContext } from '../types';

export const stringRegistryCreator: JsonSchemaTypeRegistryCreator = () => ({
  type: 'string',
  getInputNode: ({ value, onChange, onSubmit }: TypeInputContext<IJsonSchema>) => (
    <Input
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
      }}
      autoFocus
      value={value}
      onChange={onChange}
      onBlur={onSubmit}
    />
  ),
});
