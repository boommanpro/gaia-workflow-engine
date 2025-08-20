/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import React from 'react';

import { pick } from '@flowgram.ai/utils';
import { IJsonSchema } from '@flowgram.ai/json-schema';
import toast from '@douyinfe/semi-ui/lib/es/toast';
import { Toast, Tooltip } from '@douyinfe/semi-ui';
import { IconCopy, IconCopyAdd, IconDelete } from '@douyinfe/semi-icons';

import { getComponentId, typeEditorUtils } from '../utils';
import { useRemoveType } from '../hooks/type-edit';
import { type PasteDataType, usePasteData } from '../hooks/paste-data';
import { useHasErrorCell } from '../hooks/error-cell';
import { useDisabled } from '../hooks/disabled';

// import s from './index.module.less';
import { TypeEditorRowData, TypeEditorColumnConfig, TypeEditorColumnType } from '../../../types';
import { ClipboardService } from '../../../services';
import { useService, useTypeDefinitionManager } from '../../../contexts';
import { BaseIcon, CenterContainer } from './style';

const pasteTooltipsMap: Record<PasteDataType<IJsonSchema>['type'], string | undefined> = {
  invalid: 'Please confirm whether the clipboard value is correct',
  multiple: 'Multiple fields are not supported to be pasted into this field.',
  single: undefined,
};

const setCellValue = (
  rowData: TypeEditorRowData<IJsonSchema>,
  newData: IJsonSchema & {
    extra?: {
      key: string;
      required: boolean;
    };
  },
  onPaste?: (typeSchema?: IJsonSchema) => IJsonSchema | undefined
): void => {
  const othersProps = pick(rowData.self, ['required', 'description', 'flow', 'extra']);

  if (rowData.parent?.properties) {
    const { parent } = rowData;
    // const key = newDat
    if (newData.extra) {
      let { key } = newData.extra;
      const { required } = newData.extra;

      // key !== rowData.key 处理重复对某个字段进行 paste
      while (parent.properties![key] && key !== rowData.key) {
        key = `${key}__copy`;
      }

      delete parent.properties![rowData.key];

      delete newData.extra;
      let newPasteData = {
        ...newData,
        ...othersProps,
      };
      if (onPaste) {
        newPasteData = onPaste(newPasteData) || newPasteData;
      }

      parent.properties![key] = newPasteData;

      if (!parent.required) {
        parent.required = [];
      }

      const idx = parent.required.findIndex((v) => v === rowData.key);

      if (idx !== -1) {
        parent.required.splice(idx, 1);
      }
      if (required) {
        parent.required.push(key);
      }
    } else {
      let newPasteData = {
        ...newData,
        ...othersProps,
      };
      if (onPaste) {
        newPasteData = onPaste(newPasteData) || newPasteData;
      }
      parent.properties![rowData.key] = newPasteData;
    }
  }
};

export const operateColumnConfig: TypeEditorColumnConfig<IJsonSchema> = {
  type: TypeEditorColumnType.Operate,
  label: 'Operate',
  width: 11,
  focusable: false,
  viewRender: ({ rowData, onChange, typeEditor, onPaste }) => {
    const disabled = useDisabled(TypeEditorColumnType.Operate, rowData);

    const clipboard = useService<ClipboardService>(ClipboardService);

    const { pasteData } = usePasteData();

    const typeDefinition = useTypeDefinitionManager();

    const hasError = useHasErrorCell(rowData, typeEditor);

    const handleRemove = useRemoveType(rowData, onChange);

    const pasteErrorTips = pasteTooltipsMap[pasteData.type];

    return (
      <CenterContainer>
        <Tooltip content={disabled || 'Remove'}>
          <BaseIcon primary disabled={!!disabled}>
            <IconDelete
              id={getComponentId('remove-field')}
              onClick={disabled ? undefined : handleRemove}
              size="small"
            />
          </BaseIcon>
        </Tooltip>
        <Tooltip
          content={
            hasError
              ? 'The current field is incorrect and does not support copying.'
              : 'Copy this field'
          }
        >
          <BaseIcon primary disabled={!!hasError}>
            <IconCopy
              onClick={() => {
                if (hasError) {
                  return;
                }
                const copyData = {
                  ...rowData.self,
                  extra: {
                    key: rowData.key,
                    required: rowData.isRequired,
                    ...(rowData.self.extra || {}),
                  },
                };

                clipboard.writeData(JSON.stringify(copyData));
                toast.success('copy this field success!');
              }}
              size="small"
            />
          </BaseIcon>
        </Tooltip>
        <Tooltip
          content={disabled ? disabled : !pasteErrorTips ? 'Paste field here' : pasteErrorTips}
        >
          <BaseIcon primary disabled={!!(pasteErrorTips || disabled)}>
            <IconCopyAdd
              size="small"
              onClick={() => {
                if (pasteErrorTips || disabled) {
                  return;
                }
                clipboard.readData().then((data) => {
                  const parseData = typeEditorUtils.jsonParse(data) as IJsonSchema;

                  const originIndex = rowData.extra?.index || 0;

                  const config = parseData && typeDefinition.getTypeBySchema(parseData);
                  if (config && typeof parseData === 'object') {
                    typeEditorUtils.fixFlowIndex(parseData);
                    parseData.extra!.index = originIndex;
                    setCellValue(rowData, parseData as any, onPaste);

                    onChange();
                  } else {
                    Toast.warning('Please paste the correct type schema!');
                  }
                });
              }}
            />
          </BaseIcon>
        </Tooltip>
      </CenterContainer>
    );
  },

  shortcuts: {
    onEnter: ({ typeEditor }) => {
      typeEditor.moveActivePosToNextLine();
    },
    onTab: ({ typeEditor }) => {
      typeEditor.moveActivePosToNextItem();
    },

    onDown: (ctx) => {
      ctx.typeEditor.moveActivePosToNextLine();
    },
    onLeft: (ctx) => {
      ctx.typeEditor.moveActivePosToLastColumn();
    },
    onUp: (ctx) => {
      ctx.typeEditor.moveActivePosToLastLine();
    },
    onRight: (ctx) => {
      ctx.typeEditor.moveActivePosToNextColumn();
    },
  },
};
