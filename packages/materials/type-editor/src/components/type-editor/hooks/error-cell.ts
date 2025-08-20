/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

/* eslint-disable max-params */
import { useMemo } from 'react';

import { IJsonSchema } from '@flowgram.ai/json-schema';

import { useMonitorData } from '../../../utils';
import { TypeEditorPos, TypeEditorRowData, TypeEditorColumnConfig } from '../../../types';
import { TypeEditorService } from '../../../services';
import { useService } from '../../../contexts';
import { useActivePos } from './active-pos';

export const useEditCellErrorMsg = (pos: TypeEditorPos): string | undefined => {
  const typeEditor = useService<TypeEditorService<IJsonSchema>>(TypeEditorService);

  const { data: errorMsgs } = useMonitorData(typeEditor.errorMsgs);

  const msg = useMemo(
    () => errorMsgs?.find((v) => v.pos.x === pos.x && v.pos.y === pos.y)?.msg,
    [pos, errorMsgs]
  );

  return msg;
};

export const useViewCellErrorMsg = <TypeSchema extends Partial<IJsonSchema>>(
  rowData: TypeEditorRowData<TypeSchema>,
  config: TypeEditorColumnConfig<TypeSchema>,
  pos: TypeEditorPos
) => {
  const activePos = useActivePos();

  const res = useMemo(
    () =>
      (activePos.x !== pos.x || activePos.y !== pos.y) && config.validateCell
        ? config.validateCell(rowData, rowData.extraConfig)
        : undefined,
    [rowData, config, activePos, pos]
  );

  return res;
};

export const useHasErrorCell = <TypeSchema extends Partial<IJsonSchema>>(
  rowData: TypeEditorRowData<TypeSchema>,

  typeEditor: TypeEditorService<TypeSchema>
): boolean => {
  const res = useMemo(() => {
    const configs = typeEditor.columnViewConfig.map((v) => typeEditor.getConfigByType(v.type));

    return (
      configs
        .map((config) =>
          config?.validateCell ? config.validateCell(rowData, rowData.extraConfig) : undefined
        )
        .filter(Boolean).length !== 0
    );
  }, [rowData, typeEditor]);

  return res;
};
