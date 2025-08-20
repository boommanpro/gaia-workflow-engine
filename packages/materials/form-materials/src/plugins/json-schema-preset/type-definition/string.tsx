/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

/* eslint-disable react/prop-types */
import React from 'react';

import { I18n } from '@flowgram.ai/editor';
import { Input, TextArea } from '@douyinfe/semi-ui';

import { type JsonSchemaTypeRegistry } from '../manager';

export const stringRegistry: Partial<JsonSchemaTypeRegistry> = {
  type: 'string',
  ConstantRenderer: (props) =>
    props?.enableMultiLineStr ? (
      <TextArea
        autosize
        rows={1}
        placeholder={I18n.t('Please Input String')}
        disabled={props.readonly}
        {...props}
      />
    ) : (
      <Input
        size="small"
        placeholder={I18n.t('Please Input String')}
        disabled={props.readonly}
        {...props}
      />
    ),
};
