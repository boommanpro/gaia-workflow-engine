/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import React from 'react';

import { IJsonSchema, JsonSchemaTypeRegistryCreator } from '@flowgram.ai/json-schema';
import { Select } from '@douyinfe/semi-ui';

import { TypeInputContext } from '../types';

export const booleanRegistryCreator: JsonSchemaTypeRegistryCreator = () => ({
  type: 'boolean',

  getInputNode({ value, onChange, onSubmit }: TypeInputContext<IJsonSchema>): React.JSX.Element {
    return (
      <Select
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          background: 'var(--semi-color-bg-0)',
        }}
        optionList={[
          {
            value: 1,
            label: 'True',
          },
          {
            value: 0,
            label: 'False',
          },
        ]}
        className={'flow-type-select'}
        value={Number(value)}
        onSelect={(v) => {
          onChange(Boolean(v));
          onSubmit();
        }}
      />
    );
  },
});
