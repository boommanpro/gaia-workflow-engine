/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

/* eslint-disable max-params */

import React from 'react';

import { IJsonSchema } from '@flowgram.ai/json-schema';

import { type CascaderOption } from '../type';
import { TypeEditorRegistry } from '../../../types';

// import s from '../index.module.less';

const definitionToCascaderOption = <TypeSchema extends Partial<IJsonSchema>>({
  config,
  customDisableType = new Map(),
  prefix,
  parentTypes,
  disabled,
  parentType,
  level,
}: {
  level: number;
  config: TypeEditorRegistry<TypeSchema>;
  parentType?: string;
  customDisableType?: Map<string, string>;
  parentTypes: string[];
  prefix?: string;
  disabled?: string;
}): CascaderOption => {
  const typeValue = config.type;

  const optionValue = prefix ? [prefix, typeValue].join('-') : typeValue;

  const label = (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      {config.icon}
      <span>{config.label}</span>
    </div>
  );

  const customDisabled =
    config.customDisabled && config.customDisabled({ level, parentType: parentType!, parentTypes });

  const reason = disabled || customDisableType.get(typeValue) || customDisabled;

  return {
    disabled: reason,
    value: optionValue,
    label,
    type: typeValue,
    source: config.typeCascaderConfig?.unClosePanelAfterSelect ? 'custom-panel' : 'type-selector',
    isLeaf: reason
      ? true
      : !(
          (config.getSupportedItemTypes && config.getSupportedItemTypes({ level }).length !== 0) ||
          config.container
        ),
  };
};

export const typeSelectorUtils = {
  definitionToCascaderOption,
};
