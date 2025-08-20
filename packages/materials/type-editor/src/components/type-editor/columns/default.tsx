/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { IJsonSchema } from '@flowgram.ai/json-schema';
import { Tooltip, Typography } from '@douyinfe/semi-ui';

import { useDisabled } from '../hooks/disabled';
import { TypeEditorColumnConfig, TypeEditorColumnType, TypeEditorRowData } from '../../../types';
import { TypeEditorService } from '../../../services';
import { useTypeDefinitionManager } from '../../../contexts';
import {
  GlobalSelectStyle,
  KeyEditorContainer,
  KeyViewContainer,
  TypeTextContainer,
} from './style';

const useFormatValue = ({
  rowData,
  onChange,
  typeEditor,
}: {
  rowData: TypeEditorRowData<IJsonSchema>;
  typeEditor: TypeEditorService<IJsonSchema>;
  onChange: () => void;
}) => {
  const valueRef = useRef(rowData.self.default);
  const [value, setValue] = useState(rowData.self.default);

  const typeDefinition = useTypeDefinitionManager();

  useEffect(() => {
    typeEditor.editValue = value;
  }, [typeEditor, value]);

  useEffect(() => {
    setValue(rowData.self.default);
    valueRef.current = rowData.self.default;
  }, [rowData.self.default]);

  const handleSubmit = useCallback(() => {
    rowData.self.default = valueRef.current;

    const config = typeDefinition.getTypeBySchema(rowData.self);

    if (config?.formatDefault) {
      config.formatDefault(valueRef.current, rowData.self);
    }

    const parenConfig = rowData.parent && typeDefinition.getTypeBySchema(rowData.parent);

    if (parenConfig?.formatDefault) {
      parenConfig.formatDefault(valueRef.current, rowData.parent!);
    }

    onChange();

    // onViewMode();
  }, [onChange, rowData, typeDefinition]);

  const deFormatValue = useMemo(() => {
    const config = typeDefinition.getTypeBySchema(rowData.self);
    return config?.deFormatDefault ? config.deFormatDefault(value) : value;
  }, [value, rowData]);

  const handleChange = useCallback((v: unknown) => {
    valueRef.current = v;
    setValue(v);
  }, []);

  return {
    handleChange,
    handleSubmit,
    deFormatValue,
  };
};

export const TypeText = <TypeSchema extends Partial<IJsonSchema>>({
  value,
  type,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  value?: any;
  type: TypeSchema;
}) => {
  const typeDefinition = useTypeDefinitionManager();

  const content = useMemo(() => {
    const config = typeDefinition.getTypeBySchema(type);

    return config?.getValueText ? config.getValueText(value) : value;
  }, [value, type]);

  return (
    <TypeTextContainer>
      <Typography.Text ellipsis={{ showTooltip: true }}>{content}</Typography.Text>
    </TypeTextContainer>
  );
};

const ViewRender: TypeEditorColumnConfig<IJsonSchema>['viewRender'] = ({
  rowData,
  typeEditor,
  onEditMode,
  onChange,
}) => {
  const disabled = useDisabled(TypeEditorColumnType.Default, rowData);

  const typeDefinition = useTypeDefinitionManager();
  const { defaultMode = 'default' } = rowData.extraConfig;

  const { customDefaultView } = rowData.extraConfig;

  const { deFormatValue, handleChange, handleSubmit } = useFormatValue({
    rowData,
    onChange,
    typeEditor,
  });

  const customNode =
    customDefaultView &&
    customDefaultView({
      rowData,
      disabled,
      value: deFormatValue,
      onChange: handleChange,
      onSubmit: (v) => {
        handleChange(v);
        handleSubmit();
      },
    });

  if (customNode) {
    return <> {customNode}</>;
  }

  if (disabled) {
    return (
      <KeyViewContainer disabled>
        <Tooltip content={disabled}>
          <div style={{ width: '100%', height: '100%' }}>
            <TypeText value={deFormatValue} type={rowData.self} />
          </div>
        </Tooltip>
      </KeyViewContainer>
    );
  }

  if (defaultMode === 'server') {
    const config = typeDefinition.getTypeBySchema(rowData.self);

    return (
      <Tooltip content="The default value is not allowed to be modified.">
        <KeyViewContainer disabled>
          <Typography.Text>{JSON.stringify(config?.getDefaultValue?.())}</Typography.Text>
        </KeyViewContainer>
      </Tooltip>
    );
  }

  return (
    <KeyViewContainer onClick={() => onEditMode()}>
      <TypeText value={deFormatValue} type={rowData.self} />
    </KeyViewContainer>
  );
};

const EditRender: TypeEditorColumnConfig<IJsonSchema>['editRender'] = ({
  rowData,
  onChange,
  typeEditor,
  onViewMode,
}) => {
  const { deFormatValue, handleChange, handleSubmit } = useFormatValue({
    rowData,
    onChange,
    typeEditor,
  });

  const typeDefinition = useTypeDefinitionManager();
  const config = useMemo(() => typeDefinition.getTypeBySchema(rowData.self), [rowData.self]);
  return (
    <KeyEditorContainer>
      <GlobalSelectStyle />
      {config &&
        config?.getInputNode?.({
          value: deFormatValue,
          onChange: handleChange,
          type: rowData.self,
          onSubmit: () => {
            handleSubmit();
            onViewMode();
          },
        })}
    </KeyEditorContainer>
  );
};

export const defaultColumnConfig: TypeEditorColumnConfig<IJsonSchema> = {
  type: TypeEditorColumnType.Default,
  width: 15,
  label: 'Default',
  viewRender: ViewRender,
  shortcuts: {
    onEnter: ({ rowData, onChange, typeEditor, value, typeDefinitionService }) => {
      const config = typeDefinitionService.getTypeBySchema(rowData.self);
      if (config?.typeInputConfig?.canEnter) {
        rowData.self.default = value;

        onChange();

        typeEditor.moveActivePosToNextLineWithAddLine(rowData);
      }
    },
    onTab: ({ rowData, value, onChange, typeEditor }) => {
      rowData.self.default = value;
      onChange();
      typeEditor.moveActivePosToNextItem();
    },
  },
  editRender: EditRender,
};
