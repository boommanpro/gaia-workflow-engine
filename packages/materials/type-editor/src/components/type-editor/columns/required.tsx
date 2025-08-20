/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import React from 'react';

import { IJsonSchema } from '@flowgram.ai/json-schema';
import { Checkbox, Toast, Tooltip } from '@douyinfe/semi-ui';

import { typeEditorUtils } from '../utils';
import { useDisabled } from '../hooks/disabled';
import { TypeEditorRowData, TypeEditorColumnConfig, TypeEditorColumnType } from '../../../types';
import { CenterContainer } from './style';

const setCellValue = (rowData: TypeEditorRowData<IJsonSchema>) => {
  const { parent } = rowData;

  if (!parent) {
    return;
  }

  if (!parent.required) {
    parent.required = [];
  }

  const idx = parent.required.findIndex((key) => key === rowData.key);
  if (idx !== -1) {
    parent.required.splice(idx, 1);
  } else {
    parent.required.push(rowData.key);
  }
};

const ViewRender: TypeEditorColumnConfig<IJsonSchema>['viewRender'] = ({
  rowData,
  onChange,
  onEditMode,
}) => {
  const disabled = useDisabled(TypeEditorColumnType.Required, rowData);

  const child = (
    <Checkbox
      disabled={!!disabled}
      checked={!!rowData.isRequired}
      onChange={() => {
        setCellValue(rowData);
        onChange();

        onEditMode();
      }}
    />
  );

  return (
    <CenterContainer onClick={!disabled ? () => onEditMode() : undefined}>
      {disabled ? <Tooltip content={disabled}>{child}</Tooltip> : child}
    </CenterContainer>
  );
};

export const requiredColumnConfig: TypeEditorColumnConfig<IJsonSchema> = {
  type: TypeEditorColumnType.Required,
  label: 'Required',
  width: 11,
  viewRender: ViewRender,
  shortcuts: {
    onEnter: ({ onChange, rowData, typeEditor }) => {
      setCellValue(rowData);
      onChange();
      typeEditor.moveActivePosToNextLine();
    },
    onTab: ({ typeEditor }) => {
      typeEditor.moveActivePosToNextItem();
    },

    onCopy: (ctx) => {
      const {
        rowData,
        typeEditor: { clipboard },
      } = ctx;

      clipboard.writeData(
        JSON.stringify({
          required: rowData.isRequired,
        })
      );

      Toast.success('Copy required success!');
    },

    onPaste: (ctx) => {
      const {
        typeEditor: { clipboard, onChange },
        rowData,
      } = ctx;
      clipboard.readData().then((data) => {
        const parseData = typeEditorUtils.jsonParse(data);
        const disabled = (rowData.disableEditColumn || []).find(
          (r) => r.column === TypeEditorColumnType.Required
        );
        if (disabled) {
          Toast.warning('The current cell does not support editing!');
          return;
        }
        if (parseData && typeof parseData === 'object' && parseData.required !== undefined) {
          const { parent } = rowData;
          if (!parent) {
            return;
          }
          if (!parent.required) {
            parent.required = [];
          }
          const idx = parent.required.findIndex((key) => key === rowData.key);
          const originRequired = idx !== -1;
          // 值不一致才更新
          if (originRequired !== parseData.required) {
            if (idx !== -1) {
              parent.required.splice(idx, 1);
            } else {
              parent.required.push(rowData.key);
            }
            onChange();
          }
        } else {
          Toast.warning('Please paste the correct info!');
        }
      });
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
