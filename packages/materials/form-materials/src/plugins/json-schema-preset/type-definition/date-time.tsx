/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

/* eslint-disable react/prop-types */
import React from 'react';

import { format } from 'date-fns';
import { type DatePickerProps } from '@douyinfe/semi-ui/lib/es/datePicker';
import { DatePicker } from '@douyinfe/semi-ui';

import { ConditionPresetOp } from '@/components/condition-context/op';

import { type JsonSchemaTypeRegistry } from '../types';

export const dateTimeRegistry: Partial<JsonSchemaTypeRegistry> = {
  type: 'date-time',
  ConstantRenderer: (props: DatePickerProps & { readonly?: boolean }) => (
    <DatePicker
      size="small"
      type="dateTime"
      density="compact"
      defaultValue={Date.now()}
      style={{ width: '100%', ...(props.style || {}) }}
      disabled={props.readonly}
      {...props}
      onChange={(date) => {
        props.onChange?.(format(date as Date, "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'"));
      }}
      value={props.value}
    />
  ),
  conditionRule: {
    [ConditionPresetOp.EQ]: { type: 'date-time' },
    [ConditionPresetOp.NEQ]: { type: 'date-time' },
    [ConditionPresetOp.GT]: { type: 'date-time' },
    [ConditionPresetOp.GTE]: { type: 'date-time' },
    [ConditionPresetOp.LT]: { type: 'date-time' },
    [ConditionPresetOp.LTE]: { type: 'date-time' },
    [ConditionPresetOp.IS_EMPTY]: null,
    [ConditionPresetOp.IS_NOT_EMPTY]: null,
  },
};
