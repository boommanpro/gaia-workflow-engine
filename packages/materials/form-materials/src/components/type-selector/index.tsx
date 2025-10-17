/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import React, { useMemo } from 'react';

import { IJsonSchema, useTypeManager, JsonSchemaTypeManager } from '@flowgram.ai/json-schema';
import { Cascader, Icon, IconButton } from '@douyinfe/semi-ui';

import { createInjectMaterial } from '@/shared/inject-material';

export interface TypeSelectorProps {
  value?: Partial<IJsonSchema>;
  onChange?: (value?: Partial<IJsonSchema>) => void;
  readonly?: boolean;
  /**
   * @deprecated use readonly instead
   */
  disabled?: boolean;
  style?: React.CSSProperties;
}

const labelStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 5 };

export const getTypeSelectValue = (value?: Partial<IJsonSchema>): string[] | undefined => {
  if (value?.type === 'array' && value?.items) {
    return [value.type, ...(getTypeSelectValue(value.items) || [])];
  }

  return value?.type ? [value.type] : undefined;
};

export const parseTypeSelectValue = (value?: string[]): Partial<IJsonSchema> | undefined => {
  const [type, ...subTypes] = value || [];

  if (type === 'array') {
    return { type: 'array', items: parseTypeSelectValue(subTypes) };
  }

  return { type };
};

export function TypeSelector(props: TypeSelectorProps) {
  const { value, onChange, readonly, disabled, style } = props;

  const selectValue = useMemo(() => getTypeSelectValue(value), [value]);

  const typeManager = useTypeManager() as JsonSchemaTypeManager;

  const icon = typeManager.getDisplayIcon(value || {});

  const options = useMemo(
    () =>
      typeManager.getTypeRegistriesWithParentType().map((_type) => {
        const isArray = _type.type === 'array';

        return {
          label: (
            <div style={labelStyle}>
              <Icon size="small" svg={_type.icon} />
              {typeManager.getTypeBySchema(_type)?.label || _type.type}
            </div>
          ),
          value: _type.type,
          children: isArray
            ? typeManager.getTypeRegistriesWithParentType('array').map((_type) => ({
                label: (
                  <div style={labelStyle}>
                    <Icon
                      size="small"
                      svg={typeManager.getDisplayIcon({
                        type: 'array',
                        items: { type: _type.type },
                      })}
                    />
                    {typeManager.getTypeBySchema(_type)?.label || _type.type}
                  </div>
                ),
                value: _type.type,
              }))
            : [],
        };
      }),
    []
  );

  const isDisabled = readonly || disabled;

  return (
    <Cascader
      disabled={isDisabled}
      size="small"
      triggerRender={() => (
        <IconButton
          size="small"
          style={{
            ...(isDisabled ? { pointerEvents: 'none' } : {}),
            ...(style || {}),
          }}
          disabled={isDisabled}
          icon={icon}
        />
      )}
      treeData={options}
      value={selectValue}
      leafOnly={true}
      onChange={(value) => {
        onChange?.(parseTypeSelectValue(value as string[]));
      }}
    />
  );
}

TypeSelector.renderKey = 'type-selector-render-key';
export const InjectTypeSelector = createInjectMaterial(TypeSelector);
