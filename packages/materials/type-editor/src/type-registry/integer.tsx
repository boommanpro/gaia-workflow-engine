/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import React from 'react';

import { IJsonSchema, JsonSchemaTypeRegistryCreator } from '@flowgram.ai/json-schema';
import { InputNumber } from '@douyinfe/semi-ui';

import { TypeInputContext } from '../types';

export const integerRegistryCreator: JsonSchemaTypeRegistryCreator = () => ({
  type: 'integer',
  getInputNode({ value, onChange, onSubmit }: TypeInputContext<IJsonSchema>): React.JSX.Element {
    return (
      <InputNumber
        autoFocus
        value={value}
        style={{ width: '100%', height: '100%' }}
        onChange={onChange}
        onBlur={onSubmit}
      />
    );
  },
});
