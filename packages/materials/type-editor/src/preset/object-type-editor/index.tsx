/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import React, { useMemo } from 'react';

import { IJsonSchema } from '@flowgram.ai/json-schema';

import { TypeEditorColumnType, TypeEditorColumnViewConfig } from '../../types';
import { ToolbarKey, TypeEditor } from '../../components';

const defaultViewConfigs = [
  {
    type: TypeEditorColumnType.Key,
    visible: true,
  },
  {
    type: TypeEditorColumnType.Type,
    visible: true,
  },
  {
    type: TypeEditorColumnType.Description,
    visible: true,
  },
  {
    type: TypeEditorColumnType.Required,
    visible: true,
  },
  {
    type: TypeEditorColumnType.Default,
    visible: true,
  },
  {
    type: TypeEditorColumnType.Operate,
    visible: true,
  },
];

interface PropsType {
  value?: IJsonSchema;
  onChange?: (value?: IJsonSchema) => void;
  readonly?: boolean;
  config?: {
    rootKey?: string;
    viewConfigs?: TypeEditorColumnViewConfig[];
  };
}

export function ObjectTypeEditor(props: PropsType) {
  const { value, onChange, config, readonly } = props;

  const { rootKey = 'outputs', viewConfigs = defaultViewConfigs } = config || {};

  const wrapValue: IJsonSchema = useMemo(
    () => ({
      type: 'object',
      properties: { [rootKey]: value || { type: 'object' } },
    }),
    [value, rootKey]
  );

  const disableEditColumn = useMemo(() => {
    const res: any[] = [];

    if (readonly) {
      viewConfigs.forEach((v) => {
        res.push({
          column: v.type,
          reason: 'This field is not editable.',
        });
      });
    }

    return res;
  }, [readonly, viewConfigs]);

  return (
    <div>
      <TypeEditor
        readonly={readonly}
        mode="type-definition"
        toolbarConfig={[ToolbarKey.Import, ToolbarKey.UndoRedo]}
        rootLevel={1}
        value={wrapValue}
        disableEditColumn={disableEditColumn}
        onChange={(_v) => onChange?.(_v?.properties?.[rootKey])}
        onCustomSetValue={(newType) => ({
          type: 'object',
          properties: {
            [rootKey]: newType,
          },
        })}
        getRootSchema={(type) => type.properties![rootKey]}
        viewConfigs={defaultViewConfigs}
        onEditRowDataSource={(dataSource) => {
          // 不允许该行编辑 key、required
          if (dataSource[0]) {
            dataSource[0].disableEditColumn = [
              {
                column: TypeEditorColumnType.Key,
                reason: 'This field is not editable.',
              },
              {
                column: TypeEditorColumnType.Type,
                reason: 'This field is not editable.',
              },
              {
                column: TypeEditorColumnType.Required,
                reason: 'This field is not editable.',
              },
              {
                column: TypeEditorColumnType.Default,
                reason: 'This field is not editable.',
              },
              {
                column: TypeEditorColumnType.Operate,
                reason: 'This field is not editable.',
              },
            ];

            dataSource[0].cannotDrag = true;
          }

          return dataSource;
        }}
      />
    </div>
  );
}
