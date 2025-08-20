/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import React from 'react';

import { IJsonSchema, JsonSchemaTypeRegistryCreator } from '@flowgram.ai/json-schema';
import { Space, Typography } from '@douyinfe/semi-ui';

export const arrayRegistryCreator: JsonSchemaTypeRegistryCreator = ({ typeManager }) => ({
  type: 'array',

  getDisplayLabel: (type: IJsonSchema) => {
    const config = typeManager.getTypeBySchema(type);

    return (
      <Space style={{ width: '100%' }}>
        {config?.getDisplayIcon(type) || config?.icon}
        <div style={{ flex: 1, width: 0, display: 'flex' }}>
          <Typography.Text size="small" ellipsis={{ showTooltip: true }}>
            {typeManager.getComplexText(type)}
          </Typography.Text>
        </div>
      </Space>
    );
  },
});
