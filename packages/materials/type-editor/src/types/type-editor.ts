/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { FC, Ref } from 'react';

import { IJsonSchema } from '@flowgram.ai/json-schema';

import { TypeEditorRegistryManager } from '../services/type-registry-manager';
import { type ShortcutsService, type TypeEditorService } from '../services';

export interface TypeEditorPos {
  x: number;
  y: number;
}

export interface TypeEditorDropInfo {
  rowDataId: string;
  indent: number;
  index: number;
}

export interface TypeChangeContext {
  type: TypeEditorColumnType;
  oldValue: unknown;
  newValue: unknown;
}

export interface EditorProps {
  keyCheck: boolean;
}

export interface RenderProps<TypeSchema extends Partial<IJsonSchema>> {
  rowData: TypeEditorRowData<TypeSchema>;
  readonly?: boolean;
  onViewMode: () => void;
  typeEditor: TypeEditorService<TypeSchema>;
  onChildrenVisibleChange: (rowDataKey: string, newVal: boolean) => void;
  onChange: () => void;
  onPaste?: (typeSchema?: TypeSchema) => TypeSchema | undefined;
  onFieldChange?: (ctx: TypeChangeContext) => void;
  onEditMode: () => void;
  dragSource?: Ref<HTMLSpanElement>;
  error: boolean;
  onError?: (msg: string[]) => void;
  unOpenKeys: Record<string, boolean>;
  config: Omit<TypeEditorColumnViewConfig, 'type' | 'visible'>;
}

export interface ShortcutContext<TypeSchema extends Partial<IJsonSchema>> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  value: any;
  rowData: TypeEditorRowData<TypeSchema>;
  onChange: () => void;
  onRemoveEmptyLine: (id: string) => void;
  typeEditor: TypeEditorService<TypeSchema>;
  onError?: (msg?: string) => void;
  typeDefinitionService: TypeEditorRegistryManager<TypeSchema>;
}

export interface InfoContext {
  shortcuts: ShortcutsService;
}
export interface TypeEditorColumnConfig<TypeSchema extends Partial<IJsonSchema>> {
  /**
   * type
   */
  type: TypeEditorColumnType;
  /**
   * 标题
   */
  label: string;
  /**
   * 百分比
   */
  width?: number;
  /**
   * 是否可 focus
   */
  focusable?: boolean;
  /**
   * label ❓ 提示
   */
  info?: () => string;
  /**
   * 只读态 render
   */
  viewRender?: FC<RenderProps<TypeSchema>>;
  /**
   * 编辑态 render
   */
  editRender?: FC<RenderProps<TypeSchema>>;
  /**
   * 是否自定义拖拽
   */
  customDrop?: boolean;

  /**
   * 校验该行是否存在错误
   */
  validateCell?: (
    rowData: TypeEditorRowData<TypeSchema>,
    extra: TypeEditorSpecialConfig<TypeSchema>
  ) =>
    | {
        level: 'error' | 'warning';
        msg?: string;
      }
    | undefined;

  /**
   * 快捷键响应
   */
  shortcuts?: {
    onEnter?: (ctx: ShortcutContext<TypeSchema>) => void;
    onTab?: (ctx: ShortcutContext<TypeSchema>) => void;
    onUp?: (ctx: ShortcutContext<TypeSchema>) => void;
    onDown?: (ctx: ShortcutContext<TypeSchema>) => void;
    onLeft?: (ctx: ShortcutContext<TypeSchema>) => void;
    onRight?: (ctx: ShortcutContext<TypeSchema>) => void;
    onCopy?: (ctx: ShortcutContext<TypeSchema>) => void;
    onPaste?: (ctx: ShortcutContext<TypeSchema>) => void;
    onDelete?: (ctx: ShortcutContext<TypeSchema>) => void;
  };
}

export interface TypeEditorColumnViewConfig {
  /**
   * 类型
   */
  type: TypeEditorColumnType;
  /**
   * 是否可见
   */
  visible: boolean;
}

export interface DisableTypeInfo {
  type: string;
  reason: string;
}

export interface TypeEditorColumnViewConfig {
  /**
   * 类型
   */
  type: TypeEditorColumnType;
  /**
   * 是否可见
   */
  visible: boolean;
}

export enum TypeEditorColumnType {
  /**
   *
   */
  Key = 'key',
  Type = 'type',
  Required = 'required',
  Description = 'description',
  Default = 'default',
  Operate = 'operate',
  Value = 'value',
  Private = 'private',
}

export interface TypeEditorExtraInfo {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  value?: any;
}

export type TypeEditorSchema<TypeSchema extends Partial<IJsonSchema>> = TypeSchema & {
  extra?: TypeEditorExtraInfo;
};

export interface TypeEditorSpecialConfig<TypeSchema extends Partial<IJsonSchema>> {
  /**
   * 默认值展示模式
   *
   * default 默认编辑模式
   * server 为展示后端兜底默认值
   */
  defaultMode?: 'default' | 'server';
  /**
   * 支持自定义校验 Name 函数
   */
  customValidateName?: (name: string) => string;
  /**
   * 关闭自动修复 index
   */
  disableFixIndex?: boolean;

  /**
   * 是否可以编辑 key 的可见
   */
  editorVisible?: boolean | string;
  /**
   * 隐藏拖拽
   */
  hiddenDrag?: boolean;
  /**
   * 使用 extra 字段，而非 flow 字段
   */
  useExtra?: boolean;
  /**
   * type-selector 禁用类型
   */
  customDisabledTypes?: Array<DisableTypeInfo>;
  /**
   * 是否禁用 add
   */
  disabledAdd?: (rowData: TypeEditorRowData<TypeSchema>) => string;
  /**
   * 自定义默认值展示
   */
  customDefaultView?: (ctx: {
    rowData: TypeEditorRowData<TypeSchema>;
    value: unknown;
    disabled?: string;
    onChange: (value: unknown) => void;
    onSubmit: (value: unknown) => void;
  }) => JSX.Element;
  /**
   * 自定义 default 禁用规则
   */
  customDefaultEditable?: (rowData: TypeEditorRowData<TypeSchema>) => true | string;
}

export type TypeEditorRowData<TypeSchema extends Partial<IJsonSchema>> = TypeSchema & {
  /**
   * 当前行的唯一值
   */
  id: string;
  /**
   * key 值
   */
  key: string;
  /**
   * 是否必填
   */
  isRequired: boolean;
  /**
   * 层数
   */
  level: number;
  /**
   * rowData 关联的 IJsonSchema
   */
  self: TypeEditorSchema<TypeSchema>;
  /**
   * 父节点 IJsonSchema
   */
  parent?: TypeEditorSchema<TypeSchema>;
  /**
   * 子节点个数，只包括子类型
   */
  childrenCount: number;
  /**
   * 子节点个数，包括子类型嵌套类型
   */
  deepChildrenCount: number;
  /**
   * 不能编辑的列
   * 和 IJsonSchema 中 editable 的关系
   * editable 为 false，会将 disableEditColumn 每个 column 都填上
   */
  disableEditColumn?: Array<{ column: TypeEditorColumnType; reason: string }>;
  /**
   * 是否不能拖拽
   */
  cannotDrag?: boolean;
  /**
   * 行
   */
  index: number;
  /**
   *
   */
  extraConfig: TypeEditorSpecialConfig<TypeSchema>;

  /**
   * 父节点 rowId
   */
  parentId?: string;
  /**
   * path
   */
  path: string[];
};
