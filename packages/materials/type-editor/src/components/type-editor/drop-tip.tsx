/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { useEffect, useMemo, useState } from 'react';
import React from 'react';

import styled from 'styled-components';
import { IJsonSchema } from '@flowgram.ai/json-schema';

import { TypeEditorRowData } from '../../types';
import { TypeEditorService } from '../../services';
import { useService, useTypeDefinitionManager } from '../../contexts';
import { CELL_HIGHT, CELL_PADDING, HEADER_HIGHT, INDENT_WIDTH, TAB_BRA_HIGHT } from './common';

const StyledDragTip = styled.div`
  position: absolute;
  height: 1px;
  background-color: var(--semi-color-primary);
`;

export const DropTip = <TypeSchema extends Partial<IJsonSchema>>({
  dataSource,
}: {
  dataSource: Record<string, TypeEditorRowData<TypeSchema>>;
}) => {
  const typeEditor = useService<TypeEditorService<TypeSchema>>(TypeEditorService);

  const [dropInfo, setDropInfo] = useState(typeEditor.dropInfo);

  const typeService = useTypeDefinitionManager();

  useEffect(() => {
    const dispose = typeEditor.onDropInfoChange.event(setDropInfo);
    return () => {
      dispose.dispose();
    };
  }, []);

  const rowData = useMemo(() => dataSource[dropInfo.rowDataId], [dropInfo.rowDataId]);

  const rowDataCanHasChildren = useMemo(
    () =>
      rowData && rowData.type && typeService.getTypeByName(rowData.type)?.canAddField?.(rowData),
    [rowData]
  );

  return (
    <>
      {(rowData || dropInfo.rowDataId === 'header') && (
        <StyledDragTip
          style={{
            top: HEADER_HIGHT + TAB_BRA_HIGHT + (dropInfo.index + 1) * CELL_HIGHT - 1,
            right: 0,
            width: `calc(100% - ${
              /**
               * 表格 padding
               * 初始 drag icon 占一个缩进
               * rowData 本身 level 个缩进，如果是含有子节点，因为默认添加到子元素内，还需要额外加一个缩进
               */
              CELL_PADDING +
              INDENT_WIDTH +
              (dropInfo.indent + (rowDataCanHasChildren ? 1 : 0) + 1) * INDENT_WIDTH
            }px)`,
          }}
        />
      )}
    </>
  );
};
