/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

/* eslint-disable react/prop-types */
import React from 'react';

import { IJsonSchema } from '@flowgram.ai/json-schema';
import { Checkbox, Toast, Tooltip } from '@douyinfe/semi-ui';

import { typeEditorUtils } from '../utils';
import { useDisabled } from '../hooks/disabled';

// import s from './index.module.less';
import { TypeEditorColumnConfig, TypeEditorColumnType, TypeEditorRowData } from '../../../types';
import { CenterContainer } from './style';

const setCellValue = (rowData: TypeEditorRowData<IJsonSchema>) => {
  if (!rowData.extra) {
    rowData.extra = {};
  }
  rowData.extra.private = !rowData.extra.private;
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
      checked={!!rowData.extra?.private}
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

export const privateColumnConfig: TypeEditorColumnConfig<IJsonSchema> = {
  type: TypeEditorColumnType.Private,
  label: 'Private',
  width: 11,
  viewRender: ViewRender,
  info: () => 'Private under the current project.',
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
          private: !!rowData.extra?.private,
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
          (r) => r.column === TypeEditorColumnType.Private
        );
        if (disabled) {
          Toast.warning('The current cell does not support editing!');
          return;
        }
        if (parseData && typeof parseData === 'object' && parseData.private !== undefined) {
          if (!rowData.extra) {
            rowData.extra = {};
          }
          rowData.extra.private = parseData.private;
          onChange();
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
