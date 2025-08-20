/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { type ConnectDragSource } from 'react-dnd';
import React, { useCallback, useMemo } from 'react';

import classNames from 'classnames';
import { NOOP } from '@flowgram.ai/utils';
import { IJsonSchema } from '@flowgram.ai/json-schema';

import { Feedback } from '../feedback';
import {
  TypeEditorRowData,
  TypeChangeContext,
  TypeEditorColumnViewConfig,
  TypeEditorColumnType,
} from '../../types';
import { TypeEditorService } from '../../services';
import { useService } from '../../contexts';
import { EditCellContainer, EditorTableCell, ErrorMsgContainer } from './style';
import { useIsBlink } from './hooks/blink';
import { useActivePos, useCellDrop, useViewCellErrorMsg, useEditCellErrorMsg } from './hooks';
import { ErrorCellBorder } from './error';
import { CELL_HIGHT, HEADER_HIGHT, TAB_BRA_HIGHT } from './common';

export const ViewCell = <TypeSchema extends Partial<IJsonSchema>>({
  rowData,
  rowIndex,
  columnIndex,
  onChange,
  dataSourceMap,
  onError,
  onFieldChange,
  onPaste,
  unOpenKeys,
  viewConfigs,
  readonly,
  onChildrenVisibleChange,
  dragSource,
  columnType,
}: {
  rowData: TypeEditorRowData<TypeSchema>;
  rowIndex: number;
  onError?: (msg: string[]) => void;
  onPaste?: (typeSchema?: TypeSchema) => TypeSchema | undefined;
  onChange: () => void;
  columnIndex: number;
  onFieldChange?: (ctx: TypeChangeContext) => void;
  dragSource?: ConnectDragSource;
  dataSourceMap: Record<string, TypeEditorRowData<TypeSchema>>;
  onChildrenVisibleChange: (rowDataId: string, val: boolean) => void;
  /**
   * 只读态
   */
  readonly?: boolean;
  /**
   * 每个列的配置
   */
  viewConfigs: TypeEditorColumnViewConfig[];
  unOpenKeys: Record<string, boolean>;
  columnType: TypeEditorColumnType;
}) => {
  const typeEditorService = useService<TypeEditorService<TypeSchema>>(TypeEditorService);

  const config = typeEditorService.getConfigByType(columnType)!;

  const { drop } = useCellDrop(rowData, rowIndex, dataSourceMap, onChange);

  const handleEditMode = useCallback(() => {
    if (!readonly) {
      typeEditorService.setActivePos({ x: columnIndex, y: rowIndex });
    }
  }, [columnIndex, readonly, rowIndex]);

  const handleViewMode = useCallback(() => {
    typeEditorService.clearActivePos();
  }, []);

  const Render = config.viewRender;

  const feedbackInfo = useViewCellErrorMsg(rowData, config, {
    x: columnIndex,
    y: rowIndex,
  });

  return (
    <EditorTableCell
      ref={config.customDrop ? undefined : drop}
      className={classNames('semi-table-row-cell', 'cell-container')}
    >
      {feedbackInfo && (
        <>
          <ErrorCellBorder level={feedbackInfo.level} />
          <ErrorMsgContainer>
            <Feedback message={feedbackInfo.msg!} level={feedbackInfo.level} layout="absolute" />
          </ErrorMsgContainer>
        </>
      )}

      {Render ? (
        <Render
          readonly={readonly}
          config={viewConfigs.find((v) => v.type === columnType) || {}}
          dragSource={dragSource}
          unOpenKeys={unOpenKeys}
          onFieldChange={onFieldChange}
          typeEditor={typeEditorService}
          onPaste={onPaste}
          error={!!feedbackInfo}
          onError={onError}
          onChange={onChange}
          onChildrenVisibleChange={onChildrenVisibleChange}
          onViewMode={handleViewMode}
          onEditMode={handleEditMode}
          rowData={rowData}
        />
      ) : (
        `${(rowData as unknown as Record<string, unknown>)[columnType]}`
      )}
    </EditorTableCell>
  );
};

export const EditCell = <TypeSchema extends Partial<IJsonSchema>>({
  displayColumn,
  onFieldChange,
  dataSource,
  onPaste,
  unOpenKeys,
  onError,
  viewConfigs,
  onChildrenVisibleChange,
  tableDom,
  onChange,
}: {
  displayColumn: TypeEditorColumnType[];
  tableDom: HTMLTableElement;
  onError?: (msg: string[]) => void;
  onPaste?: (typeSchema?: TypeSchema) => TypeSchema | undefined;

  /**
   * 每个列的配置
   */
  viewConfigs: TypeEditorColumnViewConfig[];
  unOpenKeys: Record<string, boolean>;
  onChildrenVisibleChange: (rowDataId: string, newVal: boolean) => void;
  onChange: () => void;
  onFieldChange?: (ctx: TypeChangeContext) => void;
  dataSource: TypeEditorRowData<TypeSchema>[];
}) => {
  const typeEditorService = useService<TypeEditorService<TypeSchema>>(TypeEditorService);

  const activePos = useActivePos();

  const handleViewMode = useCallback(() => {
    typeEditorService.clearActivePos();
  }, []);

  const columnType = useMemo(() => displayColumn[activePos.x], [displayColumn, activePos.x]);

  /**
   * 获取每一列的宽度
   */
  const columnEachWidth = useMemo(() => {
    const headerNodes = tableDom.childNodes?.[0]?.childNodes?.[0];
    const width: number[] = [];
    for (const item of headerNodes.childNodes.values()) {
      // 1px border
      width.push((item as HTMLElement).clientWidth + 1);
    }

    return width;
  }, [displayColumn, tableDom, tableDom.clientWidth]);

  /**
   * 获取每一列距离 left: 0 的宽度
   */
  const columnAccWidth = useMemo(() => {
    let acc = 0;
    return columnEachWidth.map((width) => {
      acc += width;
      return acc - width;
    });
  }, [columnEachWidth]);

  const rowData = useMemo(() => dataSource[activePos.y], [dataSource, activePos.y]);

  const config = typeEditorService.getConfigByType(columnType);

  const Render = config && (config.editRender || config.viewRender);

  const errorMsg = useEditCellErrorMsg(activePos);

  const blink = useIsBlink();

  if (!config) {
    return <></>;
  }

  return (
    <>
      {rowData && (
        <EditCellContainer
          error={!!errorMsg}
          blink={blink}
          key={rowData.key + columnType}
          style={{
            width: columnEachWidth[activePos.x] + 1,
            top: HEADER_HIGHT + TAB_BRA_HIGHT + activePos.y * CELL_HIGHT + 1,
            left: columnAccWidth[activePos.x],
          }}
        >
          {Render ? (
            <Render
              error={!!errorMsg}
              onError={onError}
              config={viewConfigs.find((v) => v.type === columnType) || {}}
              key={rowData.id}
              unOpenKeys={unOpenKeys}
              onChange={onChange}
              onPaste={onPaste}
              typeEditor={typeEditorService}
              onFieldChange={onFieldChange}
              onChildrenVisibleChange={onChildrenVisibleChange}
              onEditMode={NOOP}
              onViewMode={handleViewMode}
              rowData={rowData}
            />
          ) : (
            `${(rowData as unknown as Record<string, unknown>)[columnType]}`
          )}
          {errorMsg && (
            <ErrorMsgContainer style={{ left: -1 }}>
              <Feedback message={errorMsg} level="error" layout="absolute" />
            </ErrorMsgContainer>
          )}
        </EditCellContainer>
      )}
    </>
  );
};
