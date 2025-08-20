/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import type React from 'react';
import { FC } from 'react';

import { IJsonSchema } from '@flowgram.ai/json-schema';

import {
  type TypeEditorSpecialConfig,
  type TypeEditorColumnViewConfig,
  type TypeEditorRowData,
  type TypeChangeContext,
  type TypeEditorColumnType,
  type TypeEditorSchema,
  TypeEditorColumnConfig,
} from '../../types';
import { TypeEditorOperationService, type TypeEditorService } from '../../services';
import { TypeRegistryCreatorsAdapter } from '../../contexts';

export type TypeEditorMode = 'type-definition' | 'declare-assign';

export interface DeclareAssignValueType<TypeSchema extends Partial<IJsonSchema>> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any;
  definition: {
    schema: TypeSchema;
  };
}

export type TypeEditorValue<
  Mode extends TypeEditorMode,
  TypeSchema extends Partial<IJsonSchema>
> = Mode extends 'type-definition'
  ? TypeEditorSchema<TypeSchema>
  : DeclareAssignValueType<TypeSchema>;

export enum ToolbarKey {
  Import = 'Import',
  UndoRedo = 'UndoRedo',
}
export type ToolbarConfig = {
  /**
   * 工具栏配置
   */
  type: ToolbarKey;
  /**
   * 是否禁用
   */
  disabled?: string;

  /**
   * 自定义输入渲染，仅 Import 使用
   */
  customInputRender?: FC<{
    value: string;
    onChange: (newVal: string) => void;
  }>;
};

export interface TypeEditorProp<
  Mode extends TypeEditorMode,
  TypeSchema extends Partial<IJsonSchema>
> {
  /**
   * 菜单栏配置
   */
  toolbarConfig?: (ToolbarKey | ToolbarConfig)[];
  /**
   * type editor 模式类型
   */
  mode: Mode;

  /**
   * 只读态
   */
  readonly?: boolean;
  /**
   *
   */
  tableClassName?: string;

  /**
   *  各个 cell 的特化配置
   */
  extraConfig?: TypeEditorSpecialConfig<TypeSchema>;
  /**
   * 根节点层级
   */
  rootLevel?: number;

  /**
   * 获取全局 add 的 root schema
   */
  getRootSchema?: (schema: TypeSchema) => TypeSchema;
  /**
   *
   */
  typeRegistryCreators?: TypeRegistryCreatorsAdapter<IJsonSchema>[];

  /**
   * 每个列的配置
   */
  viewConfigs: (TypeEditorColumnViewConfig & {
    config?: Partial<Omit<TypeEditorColumnConfig<TypeSchema>, 'type'>>;
  })[];

  /**
   * 每次设置 DataSource 前调用，最后修改值的钩子
   */
  onEditRowDataSource?: (data: TypeEditorRowData<TypeSchema>[]) => TypeEditorRowData<TypeSchema>[];
  /**
   * 忽略报错强制更新
   */
  forceUpdate?: boolean;

  /**
   * onError
   */
  onError?: (msg?: string[]) => void;
  /**
   * value
   */
  value?: TypeEditorValue<Mode, TypeSchema>;
  /**
   * onChange
   */
  onChange?: (newValue: TypeEditorValue<Mode, TypeSchema>) => void;
  /**
   * onPaste
   */
  onPaste?: (typeSchema?: TypeSchema) => TypeSchema | undefined;

  /**
   * onInit
   */
  onInit?: (editor: React.MutableRefObject<TypeEditorRef<Mode, TypeSchema> | undefined>) => void;

  /**
   * 当具体某个 field change
   */
  onFieldChange?: (ctx: TypeChangeContext) => void;
  /**
   * 当执行 setValue
   */
  onCustomSetValue?: (
    newValue: TypeEditorValue<Mode, TypeSchema>
  ) => TypeEditorValue<Mode, TypeSchema>;

  /**
   * 自定义空状态
   */
  customEmptyNode?: React.ReactElement;

  /**
   * 不能编辑的列
   * 和 TypeSchema 中 editable 的关系
   * editable 为 false，会将 disableEditColumn 每个 column 都填上
   */
  disableEditColumn?: Array<{ column: TypeEditorColumnType; reason: string }>;
}

export interface TypeEditorRef<
  Mode extends TypeEditorMode,
  TypeSchema extends Partial<IJsonSchema>
> {
  setValue: (newVal: TypeEditorValue<Mode, TypeSchema>) => void;
  getValue: () => TypeEditorValue<Mode, TypeSchema> | undefined;
  undo: () => void;
  redo: () => void;
  getService: () => TypeEditorService<TypeSchema> | undefined;
  getOperator: () => TypeEditorOperationService<TypeSchema> | undefined;
  getContainer: () => HTMLDivElement | undefined;
}

export interface ModeValueConfig<
  Mode extends TypeEditorMode,
  TypeSchema extends Partial<IJsonSchema>
> {
  mode: Mode;
  /**
   * 提交值到 typeSchema
   */
  convertValueToSchema: (val: TypeEditorValue<Mode, TypeSchema>) => TypeSchema;
  /**
   * typeSchema 到提交值
   */
  convertSchemaToValue: (val: TypeSchema) => TypeEditorValue<Mode, TypeSchema>;
  /**
   * 常量值生成提交值
   */
  commonValueToSubmitValue: (
    val: Record<string, unknown> | undefined
  ) => TypeEditorValue<Mode, TypeSchema>;

  toolConfig: {
    createByData: {
      viewConfig: TypeEditorColumnViewConfig[];
      genDefaultValue: () => TypeEditorValue<Mode, TypeSchema>;
    };
  };
}
