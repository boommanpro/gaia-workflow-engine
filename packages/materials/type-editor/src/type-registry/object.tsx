/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import React from 'react';

import { JsonSchemaTypeRegistryCreator } from '@flowgram.ai/json-schema';
import { Typography } from '@douyinfe/semi-ui';

export const objectRegistryCreator: JsonSchemaTypeRegistryCreator = () => ({
  type: 'object',
  getInputNode: (): React.JSX.Element => (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        padding: '0 8px',
      }}
    >
      <Typography.Text>Not Supported</Typography.Text>
    </div>
  ),
});
