/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import React from 'react';

import classNames from 'classnames';
import { IJsonSchema } from '@flowgram.ai/json-schema';
import { Empty } from '@douyinfe/semi-ui';
import { IllustrationNoContent, IllustrationNoContentDark } from '@douyinfe/semi-illustrations';

import {
  TypeEditorColumnType,
  TypeEditorRowData,
  TypeEditorColumnViewConfig,
  TypeChangeContext,
} from '../../types';
import { DragRowContainer } from './style';
import { useRowDrag } from './hooks/drag-drop';
import { ViewCell } from './cell';

interface Props<TypeSchema extends Partial<IJsonSchema>> {
  displayColumn: TypeEditorColumnType[];
  dataSourceMap: Record<string, TypeEditorRowData<TypeSchema>>;
  /**
   * 自定义空状态
   */
  customEmptyNode?: React.ReactElement;
  /**
   * 每个列的配置
   */
  viewConfigs: TypeEditorColumnViewConfig[];
  /**
   * 只读态
   */
  readonly?: boolean;
  onFieldChange?: (ctx: TypeChangeContext) => void;
  onChange: () => void;
  onPaste?: (typeSchema?: TypeSchema) => TypeSchema | undefined;
  onError?: (msg?: string[]) => void;
  onChildrenVisibleChange: (rowDataId: string, newVal: boolean) => void;
  unOpenKeys: Record<string, boolean>;
}

const Row = <TypeSchema extends Partial<IJsonSchema>>({
  displayColumn,
  data,
  ...rest
}: Props<TypeSchema> & {
  data: TypeEditorRowData<TypeSchema>;
  rowIndex: number;
}) => {
  const { preview, drag, isDragging } = useRowDrag(data.id, rest.onChildrenVisibleChange);

  return (
    <DragRowContainer ref={preview} dragging={isDragging} className={classNames('semi-table-row')}>
      {displayColumn.map((column, columnIndex) => (
        <ViewCell
          dragSource={data.cannotDrag ? undefined : drag}
          key={data.id + column}
          columnType={column}
          columnIndex={columnIndex}
          rowData={data}
          {...rest}
        />
      ))}
    </DragRowContainer>
  );
};

export const Body = <TypeSchema extends Partial<IJsonSchema>>({
  dataSource,
  customEmptyNode,
  ...rest
}: Props<TypeSchema> & {
  dataSource: TypeEditorRowData<TypeSchema>[];
}) => {
  if (dataSource.length === 0) {
    const rows = rest.displayColumn.length;
    return (
      <tbody>
        <tr>
          <td colSpan={rows}>
            {customEmptyNode ? (
              customEmptyNode
            ) : (
              <Empty
                style={{ marginTop: 40 }}
                image={<IllustrationNoContent style={{ width: 100, height: 100 }} />}
                darkModeImage={<IllustrationNoContentDark style={{ width: 100, height: 100 }} />}
                description="No content. Please add."
              />
            )}
          </td>
        </tr>
      </tbody>
    );
  }

  return (
    <tbody className="semi-table-tbody">
      <>
        {dataSource.map((data, rowIndex) => (
          <Row key={data.id} {...rest} data={data} rowIndex={rowIndex} />
        ))}
      </>
    </tbody>
  );
};
