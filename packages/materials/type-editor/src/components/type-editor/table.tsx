/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

/* eslint-disable max-params */
/* eslint-disable complexity */

import { HTML5Backend } from 'react-dnd-html5-backend';
import { DndProvider } from 'react-dnd';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import React from 'react';

import { isEqual } from 'lodash-es';
import classNames from 'classnames';
import { IJsonSchema } from '@flowgram.ai/json-schema';
import { Space } from '@douyinfe/semi-ui';

import { TypeEditorRowData, TypeEditorColumnType } from '../../types';
import { TypeEditorOperationService, TypeEditorService } from '../../services';
import { TypeRegistryCreatorsAdapter, useService, useTypeDefinitionManager } from '../../contexts';
import { fixedTSForwardRef, typeEditorUtils } from './utils';
import { type TypeEditorMode, type TypeEditorProp, TypeEditorRef } from './type';
import { EditorTable } from './style';
import { useFormatter } from './hooks/formatter-value';
import { useActivePos } from './hooks';
import { Header } from './header';
import { DropTip } from './drop-tip';
import { ROOT_FIELD_ID } from './common';
import { EditCell } from './cell';
import { Body } from './body';

const TableInner = <Mode extends TypeEditorMode, TypeSchema extends Partial<IJsonSchema>>({
  value,
  onChange,
  mode,
  viewConfigs,
  onInit,
  forceUpdate,
  onEditRowDataSource,
  rootLevel = 0,
  customEmptyNode,
  tableClassName,
  onError,
  disableEditColumn,
  readonly,
  onPaste,
  typeRegistryCreators,
  onFieldChange,
  getRootSchema,
  onCustomSetValue,
  extraConfig: originExtraConfig = {},
}: TypeEditorProp<Mode, TypeSchema>) => {
  const extraConfig = useMemo(
    () => ({
      ...originExtraConfig,
    }),
    [originExtraConfig]
  );

  const { deFormatter, formatter } = useFormatter<Mode, TypeSchema>({
    mode,
    extraConfig,
  });

  const typeSchema = useMemo(() => formatter(value), [formatter, value]);

  const typeEditor = useService<TypeEditorService<TypeSchema>>(TypeEditorService);
  const typeOperator = useService<TypeEditorOperationService<TypeSchema>>(
    TypeEditorOperationService
  );

  const [tableDom, setTableDom] = useState<HTMLTableElement>();

  const [initialSchema, setInitialSchema] = useState<TypeSchema>(() => {
    const res = typeEditorUtils.clone(typeSchema) || typeEditorUtils.getInitialSchema<TypeSchema>();

    typeOperator.storeState(res);

    return res;
  });

  // const
  const editor = useRef<TypeEditorRef<Mode, TypeSchema>>();

  useEffect(() => {
    // editor
    const instance: TypeEditorRef<Mode, TypeSchema> = {
      getService: () => typeEditor,
      setValue(originNewVal) {
        let newVal = originNewVal;

        if (onCustomSetValue) {
          newVal = onCustomSetValue(newVal);
        }

        const newSchema = formatter(newVal)!;

        setInitialSchema(newSchema);

        typeOperator.storeState(newSchema);

        const final = typeEditorUtils.formateTypeSchema<TypeSchema>(newSchema, extraConfig);

        const newValue = deFormatter(final)!;

        if (onChange) {
          onChange(newValue);
        }
      },
      getContainer: () => tableDom,
      getValue: () => {
        const rootValue = deFormatter(typeEditor.rootTypeSchema);

        return rootValue;
      },
      undo: () => {
        typeOperator.undo();
        typeEditor.onChange(typeOperator.getCurrentState(), {
          storeState: false,
        });
      },
      redo: () => {
        typeOperator.redo();
        typeEditor.onChange(typeOperator.getCurrentState(), {
          storeState: false,
        });
      },
      getOperator() {
        return typeOperator;
      },
    };
    editor.current = instance;
  }, [typeEditor, onChange, tableDom, deFormatter, formatter, extraConfig, onCustomSetValue]);

  useEffect(() => {
    onInit?.(editor);
  }, [onInit]);

  /**
   * 当前 rowData 的 children 是否不可见
   * 定义为不可见的原因：默认可见
   */
  const [unOpenKeys, setUnOpenKeys] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (
      !isEqual(typeSchema, initialSchema) &&
      typeSchema &&
      (forceUpdate || !typeEditorUtils.isTempState(initialSchema, extraConfig?.customValidateName))
    ) {
      setInitialSchema(typeEditorUtils.clone(typeSchema));
    }
  }, [typeSchema, extraConfig?.customValidateName]);

  const typeService = useTypeDefinitionManager();

  const displayColumn = useMemo(
    () => viewConfigs.filter((v) => v.visible).map((v) => v.type),
    [viewConfigs]
  );

  const { dataSource } = useMemo(() => {
    const res: TypeEditorRowData<TypeSchema>[] = [];
    let index = -1;

    const dfs = (
      schema: TypeSchema,
      config: {
        level: number;
        parentId?: string;
        key?: string;
        parent?: TypeSchema;
        canDefaultEditable?: true | string;
        canValueEditable?: true | string;
        path: string[];
      }
    ): void => {
      const {
        parentId,
        level = -1,
        key = ROOT_FIELD_ID,
        path,
        parent,
        canValueEditable = true,
        canDefaultEditable = true,
      } = config;

      const id = [parentId, key || new Date().valueOf().toString()].join('-');

      const typeConfig = typeService.getTypeBySchema(schema);

      const uid = parentId ? id : key;

      const rowData: TypeEditorRowData<TypeSchema> = {
        ...schema,
        key,
        index,
        id: uid,
        level,
        self: schema,
        parentId,
        parent,
        deepChildrenCount: 0,
        isRequired: (parent?.required || []).includes(key),
        childrenCount: 0,
        disableEditColumn: [...(disableEditColumn || [])],
        path,
        extraConfig: { ...extraConfig },
      };

      index += 1;

      typeEditor.dataSourceMap[rowData.id] = rowData;

      res.push(rowData);

      const customDefaultValidate =
        extraConfig.customDefaultEditable && extraConfig.customDefaultEditable(rowData);

      if (typeof customDefaultValidate === 'string') {
        rowData.disableEditColumn!.push({
          column: TypeEditorColumnType.Default,
          reason: customDefaultValidate,
        });
      }

      if (typeof canDefaultEditable === 'string' && level > rootLevel) {
        rowData.disableEditColumn!.push({
          column: TypeEditorColumnType.Default,
          reason: canDefaultEditable,
        });
      }

      if (typeof canValueEditable === 'string' && level > rootLevel) {
        rowData.disableEditColumn!.push({
          column: TypeEditorColumnType.Value,
          reason: canValueEditable,
        });
      }

      if (typeConfig) {
        const children =
          typeConfig.getTypeSchemaProperties && typeConfig.getTypeSchemaProperties(schema);

        const childrenParent =
          typeConfig.getPropertiesParent && typeConfig.getPropertiesParent(schema);
        const childrenParentConfig = childrenParent && typeService.getTypeBySchema(childrenParent);

        if (
          !extraConfig.customDefaultEditable &&
          typeof childrenParentConfig?.defaultEditable === 'string'
        ) {
          rowData.disableEditColumn!.push({
            column: TypeEditorColumnType.Default,
            reason: childrenParentConfig?.defaultEditable,
          });
        }

        if (children) {
          const originLen = res.length;
          rowData.childrenCount = Object.keys(children).length;

          // 如果不可见，不加子节点
          if (unOpenKeys[uid]) {
            return;
          }

          const parentPath = [...path, ...(typeConfig.getJsonPaths?.(schema) || [])];

          let idx = 0;

          const childCanValueEditable = typeConfig?.childrenValueEditable?.(schema);

          Object.keys(children)
            .map((k) => {
              // 对不存在 index 的数据先进行修正，填上默认值
              typeEditorUtils.fixFlowIndex(children[k], idx);
              idx++;
              return k;
            })
            .sort((k1, k2) => (children[k1].extra?.index || 0) - (children[k2].extra?.index || 0))
            .forEach((k) => {
              const canDefaultEditableFromParent = typeConfig.childrenDefaultEditable?.(schema);

              dfs(children[k] as unknown as TypeSchema, {
                key: k,
                parentId: id,
                parent: childrenParent as unknown as TypeSchema,
                level: level + 1,
                path: [...parentPath, k],
                canDefaultEditable:
                  typeof canDefaultEditableFromParent === 'string'
                    ? canDefaultEditableFromParent
                    : canDefaultEditable,
                canValueEditable: childCanValueEditable,
              });
            });

          rowData.deepChildrenCount = res.length - originLen;
        } else {
          if (
            !extraConfig.customDefaultEditable &&
            typeof typeConfig?.defaultEditable === 'string'
          ) {
            rowData.disableEditColumn!.push({
              column: TypeEditorColumnType.Default,
              reason: typeConfig?.defaultEditable,
            });
          }
        }
      }
    };

    if (initialSchema) {
      dfs(initialSchema, { level: -1, path: [] });
      // 不展示 root
      res.shift();

      const newData = onEditRowDataSource ? onEditRowDataSource(res) : res;

      typeEditor.setDataSource(newData);

      return {
        dataSource: newData,
      };
    }

    return {
      dataSource: [],
    };
  }, [initialSchema, disableEditColumn, unOpenKeys, onEditRowDataSource]);

  const activePos = useActivePos();

  useEffect(() => {
    typeEditor.rootTypeSchema = initialSchema;
  }, [initialSchema]);

  /**
   * 修改单行数据
   */
  const handleTypeSchemaChange = useCallback(
    (
      type?: TypeSchema,
      ctx: {
        storeState?: boolean;
      } = {}
    ) => {
      const { storeState = true } = ctx;

      const newSchema = JSON.parse(JSON.stringify(type || initialSchema)) as TypeSchema;

      setInitialSchema({ ...newSchema });

      const final = typeEditorUtils.formateTypeSchema(newSchema, extraConfig);

      if (storeState) {
        typeOperator.storeState(newSchema);
      }

      const newValue = deFormatter(final)!;

      if (onChange) {
        onChange(newValue);
      }
    },
    [initialSchema, deFormatter, extraConfig]
  );

  /**
   * 添加新数据
   */
  const handleRowDataAdd = useCallback(
    (id: string) => {
      const rowData = typeEditor.dataSourceMap[id];

      const currentSchema = rowData.self;

      const config = typeService.getTypeBySchema(rowData.self);

      if (currentSchema && config) {
        let index = -1;
        const parent = config.getPropertiesParent?.(currentSchema);
        if (!parent) {
          return;
        }
        if (!parent.properties) {
          parent.properties = {};
        }

        Object.values(parent.properties).forEach((val) => {
          if (!val.extra) {
            val.extra = {
              index: 0,
            };
          }

          index = Math.max(index, val.extra.index || 0);
        });

        const [key, schema] = typeEditorUtils.genNewTypeSchema(index + 1);

        parent.properties[key] = schema as IJsonSchema;

        const newDataSource = typeEditor.getDataSource();

        let addIndex = rowData.index + 1;
        for (let i = rowData.index + 1, len = dataSource.length; i < len; i++) {
          if (newDataSource[i].level > rowData.level) {
            addIndex++;
          } else {
            break;
          }
        }

        const newPos = {
          x: 0,
          y: addIndex,
        };

        typeEditor.setActivePos(newPos);

        handleTypeSchemaChange();
      }
    },
    [initialSchema, getRootSchema]
  );

  useEffect(() => {
    typeEditor.columnViewConfig = viewConfigs.filter((v) => v.visible);
    typeEditor.onChange = handleTypeSchemaChange;
    typeEditor.onGlobalAdd = handleRowDataAdd;

    typeEditor.typeRegistryCreators =
      typeRegistryCreators as unknown as TypeRegistryCreatorsAdapter<TypeSchema>[];
  }, [viewConfigs, handleTypeSchemaChange, typeRegistryCreators]);

  /**
   * 展开收起子字段
   */
  const handleChildrenVisibleChange = useCallback(
    (rowDataId: string, newVal: boolean) => {
      const newData = { ...unOpenKeys };

      newData[rowDataId] = newVal;
      setUnOpenKeys(newData);
    },
    [unOpenKeys]
  );

  return (
    <>
      <DndProvider backend={HTML5Backend}>
        <Space vertical style={{ width: '100%' }}>
          <div style={{ width: '100%' }}>
            <EditorTable
              ref={(dom) => setTableDom(dom as React.SetStateAction<HTMLTableElement | undefined>)}
              className={classNames('semi-table', tableClassName)}
            >
              <Header
                dataSourceMap={typeEditor.dataSourceMap}
                value={initialSchema}
                readonly={readonly}
                onChange={handleTypeSchemaChange}
                displayColumn={displayColumn}
              />
              <Body
                viewConfigs={viewConfigs}
                onFieldChange={onFieldChange}
                onPaste={onPaste}
                customEmptyNode={customEmptyNode}
                readonly={readonly}
                dataSourceMap={typeEditor.dataSourceMap}
                unOpenKeys={unOpenKeys}
                onError={onError}
                onChildrenVisibleChange={handleChildrenVisibleChange}
                onChange={handleTypeSchemaChange}
                dataSource={dataSource}
                displayColumn={displayColumn}
              />
            </EditorTable>
          </div>
        </Space>
      </DndProvider>

      {/** 当前编辑的单元格，单独渲染，减少表格的重复渲染 **/}
      {activePos.x !== -1 && activePos.y !== -1 && tableDom && (
        <EditCell
          viewConfigs={viewConfigs}
          unOpenKeys={unOpenKeys}
          onPaste={onPaste}
          onFieldChange={onFieldChange}
          onError={onError}
          onChildrenVisibleChange={handleChildrenVisibleChange}
          onChange={handleTypeSchemaChange}
          tableDom={tableDom}
          dataSource={dataSource}
          displayColumn={displayColumn}
        />
      )}
      {/** 当前拖拽的提示辅助框 **/}
      <DropTip dataSource={typeEditor.dataSourceMap} />
    </>
  );
};

export const Table = fixedTSForwardRef(TableInner);
