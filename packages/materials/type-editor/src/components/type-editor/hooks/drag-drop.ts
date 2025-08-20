/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

/* eslint-disable max-params */

import { useDrag, useDrop } from 'react-dnd';

import { IJsonSchema } from '@flowgram.ai/json-schema';
import { Toast } from '@douyinfe/semi-ui';

import { typeEditorUtils } from '../utils';
import { TypeEditorRowData } from '../../../types';
import { TypeEditorService } from '../../../services';
import { useService, useTypeDefinitionManager } from '../../../contexts';

export const useRowDrag = (
  id: string,
  onChildrenVisibleChange: (rowDataId: string, newVal: boolean) => void
) => {
  const [{ isDragging }, drag, preview] = useDrag(
    () => ({
      type: 'node-editor-dnd',
      item: () => {
        onChildrenVisibleChange(id, true);
        return {
          id,
        };
      },
      collect: (monitor) => ({
        isDragging: monitor.isDragging(),
      }),
    }),
    [id]
  );

  return {
    drag,
    isDragging,
    preview,
  };
};

interface DragItem {
  id: string;
}

export const useCellDrop = <TypeSchema extends Partial<IJsonSchema>>(
  rowData: TypeEditorRowData<TypeSchema>,
  index: number,
  dataSource: Record<string, TypeEditorRowData<TypeSchema>>,
  onChange: () => void
) => {
  const typeEditor = useService<TypeEditorService<TypeSchema>>(TypeEditorService);

  const typeService = useTypeDefinitionManager();
  const [{ isOver }, drop] = useDrop(
    () => ({
      accept: 'node-editor-dnd',
      drop: (item: DragItem) => {
        if (item.id === rowData.id) {
          typeEditor.clearDropInfo();
          return;
        }

        const dragData = dataSource[item.id];

        const definition = typeService.getTypeBySchema(rowData.self);

        if (definition) {
          const canHasChild = definition.canAddField?.(rowData.self);

          let dropParent: IJsonSchema;
          let dropIndex: number;
          if (canHasChild) {
            dropParent = definition.getPropertiesParent?.(rowData.self)! as IJsonSchema;
            dropIndex = -1;
          } else {
            dropParent = rowData.parent! as IJsonSchema;
            dropIndex = (rowData.extra?.index || 0) + 0.1;
          }

          if (dropParent?.properties?.[dragData.key] && dropParent !== dragData.parent) {
            Toast.error('drop error: there is a duplicate key in the current object');
            typeEditor.clearDropInfo();

            return;
          }

          // 删除原来的引用
          if (dragData.parent?.properties) {
            delete dragData.parent.properties[dragData.key];
          }

          // 添加到新的节点
          if (!dropParent.properties) {
            dropParent.properties = {};
          }
          dropParent.properties[dragData.key] = dragData.self as IJsonSchema;
          typeEditorUtils.fixFlowIndex(dragData);
          dragData.extra!.index = dropIndex;

          // 分别重新 sort dropParent 和 dragParent
          typeEditorUtils.sortProperties(dropParent);
          typeEditorUtils.sortProperties(dragData.parent!);
          onChange();
        }

        typeEditor.clearDropInfo();
      },
      hover() {
        typeEditor.setDropInfo({
          indent: rowData.level,
          index,
          rowDataId: rowData.id,
        });
      },
      collect: (monitor) => ({
        isOver: monitor.isOver(),
      }),
    }),
    [rowData]
  );

  return {
    drop,
    isOver,
  };
};

export const useHeaderDrop = <TypeSchema extends Partial<IJsonSchema>>(
  root: TypeSchema,
  dataSource: Record<string, TypeEditorRowData<TypeSchema>>,
  onChange: () => void
) => {
  const typeEditor = useService<TypeEditorService<TypeSchema>>(TypeEditorService);

  const typeService = useTypeDefinitionManager();

  const [{ isOver }, drop] = useDrop(
    () => ({
      accept: 'node-editor-dnd',
      drop: (item: DragItem) => {
        const dragData = dataSource[item.id];

        const definition = typeService.getTypeBySchema(root);

        if (definition) {
          const canHasChild = definition.canAddField(root);

          let dropParent: IJsonSchema;
          let dropIndex: number;
          if (canHasChild) {
            dropParent = definition.getPropertiesParent(root)! as IJsonSchema;
            dropIndex = -1;

            if (dropParent?.properties?.[dragData.key] && dropParent !== dragData.parent) {
              Toast.error('drop error: there is a duplicate key in the current object');
              typeEditor.clearDropInfo();

              return;
            }

            // 删除原来的引用
            if (dragData.parent?.properties) {
              delete dragData.parent.properties[dragData.key];
            }

            // 添加到新的节点
            if (!dropParent.properties) {
              dropParent.properties = {};
            }
            dropParent.properties[dragData.key] = dragData.self as IJsonSchema;
            typeEditorUtils.fixFlowIndex(dragData);
            dragData.extra!.index = dropIndex;

            // 分别重新 sort dropParent 和 dragParent
            typeEditorUtils.sortProperties(dropParent);
            typeEditorUtils.sortProperties(dragData.parent!);
            onChange();
          }

          typeEditor.clearDropInfo();
        }
      },
      hover() {
        typeEditor.setDropInfo({
          indent: 0,
          index: -1,
          rowDataId: 'header',
        });
      },
      collect: (monitor) => ({
        isOver: monitor.isOver(),
      }),
    }),
    [root]
  );

  return {
    drop,
    isOver,
  };
};
