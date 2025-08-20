/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import React from 'react';

import { IJsonSchema } from '@flowgram.ai/json-schema';
import { Tooltip } from '@douyinfe/semi-ui';
import { IconInfoCircle } from '@douyinfe/semi-icons';

import { TypeEditorColumnType, TypeEditorRowData } from '../../types/type-editor';
import { TypeEditorService } from '../../services';
import { useService } from '../../contexts';
import { EditorTableTitle, EditorTableHeader, BaseIcon } from './style';
import { useHeaderDrop } from './hooks';

export const Header = <TypeSchema extends Partial<IJsonSchema>>({
  displayColumn,
  value,
  readonly,
  dataSourceMap,
  onChange,
}: {
  displayColumn: TypeEditorColumnType[];
  dataSourceMap: Record<string, TypeEditorRowData<TypeSchema>>;
  onChange: () => void;

  readonly?: boolean;

  value: TypeSchema;
}) => {
  const typeEditorService = useService<TypeEditorService<TypeSchema>>(TypeEditorService);

  const { drop } = useHeaderDrop(value, dataSourceMap, onChange);

  return (
    <thead className="semi-table-thead">
      <tr ref={drop} className="semi-table-row">
        {displayColumn.map((v) => {
          const config = typeEditorService.getConfigByType(v);

          return (
            <EditorTableHeader
              key={v}
              style={{
                width: config?.width ? `${config.width}%` : undefined,
                paddingLeft: readonly ? '24px !important' : undefined,
              }}
              className="semi-table-row-head"
              scope="col"
            >
              <EditorTableTitle>
                {config?.label}
                {config?.info && (
                  <Tooltip content={config.info()}>
                    <BaseIcon>
                      <IconInfoCircle style={{ marginLeft: 4 }} size="small" />
                    </BaseIcon>
                  </Tooltip>
                )}
              </EditorTableTitle>
            </EditorTableHeader>
          );
        })}
      </tr>
    </thead>
  );
};
