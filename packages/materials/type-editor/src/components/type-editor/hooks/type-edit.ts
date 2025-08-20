/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import React, { useCallback } from 'react';

import { IJsonSchema } from '@flowgram.ai/json-schema';
import { Toast } from '@douyinfe/semi-ui';

import { typeEditorUtils } from '../utils';
import { TypeEditorRowData } from '../../../types';
import { TypeEditorService, ClipboardService } from '../../../services';
import { useService, useTypeDefinitionManager } from '../../../contexts';
import { usePasteData } from './paste-data';

export const useAddType = <TypeSchema extends Partial<IJsonSchema>>(
  rowData: TypeEditorRowData<TypeSchema>,
  onChange: () => void
) => {
  const typeEditor = useService<TypeEditorService<TypeSchema>>(TypeEditorService);

  const typeService = useTypeDefinitionManager();

  const config = typeService.getTypeBySchema(rowData.self);

  const handleAddType = useCallback(
    (e: React.MouseEvent) => {
      if (!config) {
        return;
      }
      const currentSchema = rowData.self;
      if (currentSchema) {
        let index = -1;

        const parent = config.getPropertiesParent?.(currentSchema);

        if (!parent) {
          return false;
        }

        if (!parent.properties) {
          parent.properties = {};
        }

        Object.values(parent.properties).forEach((val) => {
          if (!val.extra) {
            val.extra = {
              index: 0,
            };
          }

          index = Math.max(index, val.extra?.index || 0);
        });

        const [key, schema] = typeEditorUtils.genNewTypeSchema(index + 1);

        parent.properties[key] = schema as IJsonSchema;

        const dataSource = typeEditor.getDataSource();

        let addIndex = rowData.index + 1;
        for (let i = rowData.index + 1, len = dataSource.length; i < len; i++) {
          if (dataSource[i].level > rowData.level) {
            addIndex++;
          } else {
            break;
          }
        }

        const newPos = {
          x: 0,
          y: addIndex,
        };
        onChange();
        typeEditor.setActivePos(newPos);
      }

      e.stopPropagation();
      e.preventDefault();
    },
    [rowData, config, onChange]
  );

  return handleAddType;
};

export const usePasteAddType = <TypeSchema extends Partial<IJsonSchema>>(
  rowData: TypeEditorRowData<TypeSchema>,
  onChange: () => void,
  onPaste?: (type?: TypeSchema) => TypeSchema | undefined
) => {
  const typeService = useTypeDefinitionManager();

  const clipboard = useService<ClipboardService>(ClipboardService);

  const { pasteDataFormate } = usePasteData<TypeSchema>();

  const handlePasteAddType = useCallback(
    (e: React.MouseEvent) => {
      clipboard.readData().then((data) => {
        const parseData = pasteDataFormate(data);
        if (parseData.type === 'invalid') {
          Toast.warning('Please paste the correct type schema!');
          e.stopPropagation();
          e.preventDefault();
          return;
        }
        const currentSchema = rowData.self;
        let index = -1;
        const pasteDataItems =
          parseData.type === 'single' ? [parseData.value] : [...parseData.value];
        const config = typeService.getTypeBySchema(currentSchema);
        const parent = config?.getPropertiesParent?.(currentSchema);
        if (!parent) {
          return;
        }
        if (!parent.properties) {
          parent.properties = {};
        }
        Object.values(parent.properties).forEach((val) => {
          if (!val.extra) {
            val.extra = {
              index: 0,
            };
          }
          index = Math.max(index, val.extra.index || 0);
        });
        pasteDataItems.forEach((item) => {
          let itemKey =
            (item as { extra?: { key?: string } })?.extra?.key || typeEditorUtils.genEmptyKey();
          // key !== rowData.key 处理重复对某个字段进行 paste
          while (parent.properties![itemKey]) {
            itemKey = `${itemKey}__copy`;
          }
          if (!(item as { extra?: { value?: unknown } })?.extra?.value) {
            delete (item as { extra?: { value?: string } }).extra;
          }
          item.extra = { index: ++index };
          if (onPaste) {
            item = onPaste(item) || item;
          }
          parent.properties![itemKey] = item as IJsonSchema;
        });
        onChange();
      });
      e.stopPropagation();
      e.preventDefault();
    },

    [rowData, onChange]
  );

  return handlePasteAddType;
};

export const useRemoveType = <TypeSchema extends Partial<IJsonSchema>>(
  rowData: TypeEditorRowData<TypeSchema>,
  onChange: () => void
) => {
  const typeEditorService = useService<TypeEditorService<TypeSchema>>(TypeEditorService);

  return useCallback(() => {
    const { parent } = rowData;
    if (!parent) {
      return;
    }
    const { properties = {} } = parent;

    delete properties[rowData.key];
    typeEditorUtils.sortProperties(rowData.parent!);

    if (typeEditorService.activePos.y === rowData.index) {
      typeEditorService.clearActivePos();
    }
    typeEditorService.refreshErrorMsgAfterRemove(rowData.index);

    onChange();
  }, [onChange, rowData]);
};
