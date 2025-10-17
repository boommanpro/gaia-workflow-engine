/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

/* eslint-disable react/prop-types */
import React from 'react';

import { I18n } from '@flowgram.ai/editor';
import { Input, TextArea } from '@douyinfe/semi-ui';

import { ConditionPresetOp } from '@/components/condition-context/op';

import { type JsonSchemaTypeRegistry } from '../types';

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
  conditionRule: {
    [ConditionPresetOp.EQ]: { type: 'string' },
    [ConditionPresetOp.NEQ]: { type: 'string' },
    [ConditionPresetOp.CONTAINS]: { type: 'string' },
    [ConditionPresetOp.NOT_CONTAINS]: { type: 'string' },
    [ConditionPresetOp.IN]: {
      type: 'array',
      items: { type: 'string' },
    },
    [ConditionPresetOp.NIN]: {
      type: 'array',
      items: { type: 'string' },
    },
    [ConditionPresetOp.IS_EMPTY]: null,
    [ConditionPresetOp.IS_NOT_EMPTY]: null,
  },
};
