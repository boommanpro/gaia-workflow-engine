/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { useEffect, useState } from 'react';
import React from 'react';

import { IJsonSchema } from '@flowgram.ai/json-schema';
import { Tooltip } from '@douyinfe/semi-ui';

import { useDisabled } from '../hooks';
import { TypeEditorColumnConfig, TypeEditorColumnType } from '../../../types';
import { KeyEditorContainer, KeyEditorInput, KeyViewContainer, KeyViewText } from './style';

const ViewRender: TypeEditorColumnConfig<IJsonSchema>['viewRender'] = ({ rowData, onEditMode }) => {
  const disabled = useDisabled(TypeEditorColumnType.Description, rowData);

  if (disabled) {
    return (
      <KeyViewContainer disabled>
        <Tooltip content={disabled}>
          <KeyViewText>{rowData.description}</KeyViewText>
        </Tooltip>
      </KeyViewContainer>
    );
  }

  return (
    <KeyViewContainer onClick={() => onEditMode()}>
      <KeyViewText>{rowData.description}</KeyViewText>
    </KeyViewContainer>
  );
};

const EditRender: TypeEditorColumnConfig<IJsonSchema>['editRender'] = ({
  rowData,
  onChange,
  typeEditor,
  onViewMode,
}) => {
  const [value, setValue] = useState(rowData.description);

  useEffect(() => {
    typeEditor.editValue = value;
  }, [typeEditor, value]);

  useEffect(() => {
    setValue(rowData.description);
  }, [rowData.description]);

  return (
    <KeyEditorContainer>
      <KeyEditorInput
        onChange={setValue}
        autoFocus
        onBlur={() => {
          const { self } = rowData;
          self.description = value;
          onChange();

          onViewMode();
        }}
        value={value}
      />
    </KeyEditorContainer>
  );
};

export const descriptionColumnConfig: TypeEditorColumnConfig<IJsonSchema> = {
  type: TypeEditorColumnType.Description,
  width: 15,
  label: 'Description',
  viewRender: ViewRender,
  shortcuts: {
    onEnter: ({ rowData, value, onChange, typeEditor }) => {
      rowData.self.description = value;
      onChange();
      typeEditor.moveActivePosToNextLineWithAddLine(rowData);
    },
    onTab: ({ rowData, value, onChange, typeEditor }) => {
      rowData.self.description = value;
      onChange();
      typeEditor.moveActivePosToNextItem();
    },
  },
  editRender: EditRender,
};
