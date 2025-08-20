/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import React, { useCallback } from 'react';

import { IJsonSchema } from '@flowgram.ai/json-schema';
import { Tooltip } from '@douyinfe/semi-ui';
import { IconEyeClosed, IconEyeOpened } from '@douyinfe/semi-icons';

import { BaseIcon } from '../columns/style';
import { TypeEditorRowData, TypeEditorSpecialConfig, TypeEditorColumnType } from '../../../types';
import { useDisabled } from './disabled';

export const useKeyVisible = <TypeSchema extends Partial<IJsonSchema>>(
  rowData: TypeEditorRowData<TypeSchema>,
  onChange: () => void,
  extraConfig: TypeEditorSpecialConfig<TypeSchema>
): React.JSX.Element => {
  const disabled = useDisabled(TypeEditorColumnType.Key, rowData);

  const handleVisibleChange = useCallback(
    (e: React.MouseEvent<HTMLSpanElement, MouseEvent>) => {
      const currentSchema = rowData.self;

      if (!currentSchema.extra) {
        currentSchema.extra = {};
      }

      currentSchema.extra.hidden = !currentSchema.extra.hidden;
      onChange();

      e.stopPropagation();
      e.preventDefault();
    },
    [rowData.self, onChange]
  );

  const disableContent =
    disabled || typeof extraConfig.editorVisible === 'string'
      ? disabled || extraConfig.editorVisible
      : undefined;

  const visibleNode = (
    <>
      {disableContent ? (
        <Tooltip content={disableContent}>
          <BaseIcon disabled>
            <IconEyeOpened size="small" />
          </BaseIcon>
        </Tooltip>
      ) : rowData.extra?.hidden ? (
        <BaseIcon>
          <IconEyeClosed onClick={handleVisibleChange} size="small" />
        </BaseIcon>
      ) : (
        <BaseIcon>
          <IconEyeOpened onClick={handleVisibleChange} size="small" />
        </BaseIcon>
      )}
    </>
  );

  return extraConfig.editorVisible ? visibleNode : <></>;
};
