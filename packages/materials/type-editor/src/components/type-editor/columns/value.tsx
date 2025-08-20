/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { FC, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import React from 'react';

import { IJsonSchema } from '@flowgram.ai/json-schema';
import { Tooltip, Typography } from '@douyinfe/semi-ui';
// import { TypeInput, TypeText } from '@api-builder/base-type-definition';

import { useDisabled } from '../hooks/disabled';
import { TypeEditorColumnConfig, TypeEditorColumnType } from '../../../types';
import { useTypeDefinitionManager } from '../../../contexts';
import {
  GlobalSelectStyle,
  KeyEditorContainer,
  KeyViewContainer,
  TypeTextContainer,
} from './style';

export const TypeText: FC<{
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  value?: any;
  type: IJsonSchema;
}> = ({ value, type }) => {
  const typeDefinition = useTypeDefinitionManager();

  const content = useMemo(() => {
    const config = typeDefinition.getTypeBySchema(type);

    return config?.getValueText ? config.getValueText(value) : value || '';
  }, [value, type]);

  return (
    <TypeTextContainer>
      <Typography.Text ellipsis={{ showTooltip: true }}>{content}</Typography.Text>
    </TypeTextContainer>
  );
};

const ViewRender: TypeEditorColumnConfig<IJsonSchema>['viewRender'] = ({ rowData, onEditMode }) => {
  const disabled = useDisabled(TypeEditorColumnType.Value, rowData);

  if (disabled) {
    return (
      <KeyViewContainer disabled>
        <Tooltip content={disabled}>
          <div style={{ width: '100%', height: '100%' }}>
            <TypeText value={rowData.self?.extra?.value} type={rowData.self} />
          </div>
        </Tooltip>
      </KeyViewContainer>
    );
  }

  return (
    <KeyViewContainer onClick={() => onEditMode()}>
      <TypeText value={rowData.self?.extra?.value} type={rowData.self} />
    </KeyViewContainer>
  );
};

const EditRender: TypeEditorColumnConfig<IJsonSchema>['editRender'] = ({
  rowData,
  onChange,
  typeEditor,
  onViewMode,
}) => {
  const valueRef = useRef(rowData.self.extra?.value);
  const [value, setValue] = useState(rowData.self.extra?.value);
  const typeDefinition = useTypeDefinitionManager();
  const config = useMemo(() => typeDefinition.getTypeBySchema(rowData.self), [rowData.self]);
  useEffect(() => {
    typeEditor.editValue = value;
  }, [typeEditor, value]);

  useEffect(() => {
    setValue(rowData.self.extra?.value);
    valueRef.current = rowData.self.extra?.value;
  }, [rowData.self.extra?.value]);

  const handleSubmit = useCallback(() => {
    if (!rowData.self.extra) {
      rowData.self.extra = {};
    }

    rowData.self.extra.value = valueRef.current;
    onChange();

    onViewMode();
  }, [onChange, rowData]);

  return (
    <KeyEditorContainer>
      <GlobalSelectStyle />
      {config &&
        config?.getInputNode?.({
          value: value,
          onChange: (v: unknown) => {
            valueRef.current = v;
            setValue(v);
          },
          type: rowData.self,
          onSubmit: () => {
            handleSubmit();
            onViewMode();
          },
        })}
    </KeyEditorContainer>
  );
};

export const valueColumnConfig: TypeEditorColumnConfig<IJsonSchema> = {
  type: TypeEditorColumnType.Value,
  width: 15,
  label: 'Value',
  viewRender: ViewRender,
  shortcuts: {
    onEnter: ({ rowData, onChange, typeEditor, value, typeDefinitionService }) => {
      const config = typeDefinitionService.getTypeBySchema(rowData.self);
      if (config?.typeInputConfig?.canEnter) {
        rowData.self.description = value;

        onChange();
        typeEditor.moveActivePosToNextLine();
      }
    },
    onTab: ({ rowData, value, onChange, typeEditor }) => {
      rowData.self.description = value;
      onChange();
      typeEditor.moveActivePosToNextItem();
    },
  },
  editRender: EditRender,
};
