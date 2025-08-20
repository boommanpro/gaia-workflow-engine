/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import React, { useEffect, useMemo, useState } from 'react';

import { pick } from '@flowgram.ai/utils';
import { IJsonSchema } from '@flowgram.ai/json-schema';
import { Toast, Tooltip } from '@douyinfe/semi-ui';
import { IconHelpCircle } from '@douyinfe/semi-icons';

import { typeEditorUtils } from '../utils';
import { useDisabled } from '../hooks/disabled';
import { TypeSelector } from '../../type-selector';
import { TypeEditorColumnConfig, TypeEditorColumnType, TypeEditorRowData } from '../../../types';
import { useTypeDefinitionManager } from '../../../contexts';
import { BaseIcon, KeyEditorContainer, KeyViewContainer, TypeDisableViewContainer } from './style';

const ViewRender: TypeEditorColumnConfig<IJsonSchema>['viewRender'] = ({ rowData, onEditMode }) => {
  const typeService = useTypeDefinitionManager();

  const disabled = useDisabled(TypeEditorColumnType.Type, rowData);
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    typeService.onTypeRegistryChange(() => {
      setRefresh((v) => v + 1);
    });
  }, [typeService]);

  const typeConfig = useMemo(() => typeService.getTypeBySchema(rowData.self), [refresh, rowData]);

  const unknownNode = (
    <BaseIcon>
      <IconHelpCircle style={{ marginRight: 4 }} />
      Unknown
    </BaseIcon>
  );

  return disabled ? (
    <>
      <TypeDisableViewContainer>
        <Tooltip content={disabled}>
          {typeConfig?.getDisplayLabel?.(rowData) || unknownNode}
        </Tooltip>
      </TypeDisableViewContainer>
    </>
  ) : (
    <KeyViewContainer
      onClick={() => {
        onEditMode();
      }}
    >
      {typeConfig?.getDisplayLabel?.(rowData) || unknownNode}
    </KeyViewContainer>
  );
};

const setCellValue = (rowData: TypeEditorRowData<IJsonSchema>, newData: IJsonSchema): void => {
  const othersProps = pick(rowData.self, ['required', 'description', 'flow']);

  if (rowData.parent?.properties) {
    rowData.parent.properties[rowData.key] = {
      ...newData,
      ...othersProps,
    };
  }
};

const EditRender: TypeEditorColumnConfig<IJsonSchema>['editRender'] = ({
  rowData,
  onChange,
  typeEditor,
  onViewMode,
}) => {
  const [value, setValue] = useState(rowData.self);
  const typeService = useTypeDefinitionManager();

  return (
    <KeyEditorContainer>
      <TypeSelector
        value={value}
        typeRegistryCreators={typeEditor.typeRegistryCreators}
        disableTypes={rowData.extraConfig?.customDisabledTypes}
        onDropdownVisibleChange={(vis) => {
          if (!vis) {
            onViewMode();
          }
        }}
        onChange={(newData, ctx) => {
          if (!newData) {
            return;
          }

          setCellValue(rowData, newData);

          setValue(newData);
          onChange();

          let unClose = false;

          typeEditorUtils.traverseIJsonSchema(newData, (type) => {
            const def = typeService.getTypeBySchema(type);
            if (def?.typeCascaderConfig?.unClosePanelAfterSelect) {
              unClose = true;
            }
          });

          if (ctx.source === 'type-selector' && !unClose) {
            onViewMode();
          }
        }}
        defaultOpen
        onBlur={() => {
          onViewMode();
        }}
      />
    </KeyEditorContainer>
  );
};
export const typeColumnConfig: TypeEditorColumnConfig<IJsonSchema> = {
  type: TypeEditorColumnType.Type,
  label: 'Type',
  width: 20,
  viewRender: ViewRender,
  shortcuts: {
    onTab: ({ typeEditor }) => {
      typeEditor.moveActivePosToNextItem();
    },
    onCopy: (ctx) => {
      const {
        typeEditor: { typeDefinition, clipboard },
        rowData,
      } = ctx;
      const config = typeDefinition.getTypeBySchema(rowData.self);
      if (config) {
        const optionValue = config.getStringValueByTypeSchema?.(rowData.self);
        const type =
          optionValue && config.getTypeSchemaByStringValue
            ? config.getTypeSchemaByStringValue(optionValue)
            : config.getDefaultSchema();
        type.properties = rowData.properties;
        type.required = rowData.required;
        clipboard.writeData(JSON.stringify(type));
        Toast.success('Copy type success!');
      } else {
        Toast.error('Copy type failed: this type undefined');
      }
    },

    onPaste: (ctx) => {
      const {
        typeEditor: { typeDefinition, clipboard, onChange },
        rowData,
      } = ctx;
      clipboard.readData().then((data) => {
        const parseData = typeEditorUtils.jsonParse(data) as IJsonSchema;
        const originIndex = rowData.extra?.index || 0;
        const config = parseData && typeDefinition.getTypeBySchema(parseData);
        if (config && typeof parseData === 'object') {
          typeEditorUtils.fixFlowIndex(parseData);
          if (parseData.extra) {
            parseData.extra.index = originIndex;
          }
          setCellValue(rowData, parseData);
          onChange();
        } else {
          Toast.warning('Please paste the correct type schema!');
        }
      });
    },
  },
  editRender: EditRender,
};
