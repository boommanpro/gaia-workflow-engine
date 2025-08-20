/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { IJsonSchema, JsonSchemaTypeRegistry } from '@flowgram.ai/json-schema';

export interface TypeInputConfig<TypeSchema extends Partial<IJsonSchema>> {
  canEnter?: boolean;

  getProps?: (typeSchema: TypeSchema) => Record<string, unknown>;
}

export interface FlowSchemaInitCtx {
  enum?: string[];
}

export interface TypeInputContext<TypeSchema extends Partial<IJsonSchema>> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  value?: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onChange: (newVal: any) => void;
  type: TypeSchema;
  onSubmit: () => void;
}
export interface TypeCascaderConfig<TypeSchema extends Partial<IJsonSchema>> {
  /**
   * 自定义 CascaderPanel
   */
  customCascaderPanel?: (ctx: {
    typeSchema: TypeSchema;
    onChange: (typeSchema: TypeSchema) => void;
    onFocus?: () => void;
    onBlur?: () => void;
  }) => JSX.Element;
  /**
   * 选中后是否不关闭面板
   */
  unClosePanelAfterSelect?: boolean;
  /**
   * 获取生成 schema 的 ctx
   */
  generateInitCtx?: (typeSchema: TypeSchema) => FlowSchemaInitCtx;
}

export interface TypeEditorRegistry<TypeSchema extends Partial<IJsonSchema>>
  extends JsonSchemaTypeRegistry<TypeSchema> {
  /**
   * 当前字段是否支持 default
   */
  defaultEditable?: true | string;
  /**
   * 自定义 disabled
   */
  customDisabled?: (ctx: { level: number; parentType: string; parentTypes: string[] }) => string;

  /**
   * typeInput 设置
   */
  typeInputConfig?: TypeInputConfig<TypeSchema>;
  /**
   * typeCascader 设置
   */
  typeCascaderConfig?: TypeCascaderConfig<TypeSchema>;

  /**
   * 从默认值上下文
   */
  formatDefault?: (val: any, type: IJsonSchema) => IJsonSchema;

  /**
   *
   */
  deFormatDefault?: (val: any) => any;

  /**
   * 子字段是否可以编辑 default
   */
  childrenDefaultEditable?: (type: TypeSchema) => true | string;
  /**
   * 子字段是否可以编辑 default
   */
  childrenValueEditable?: (type: TypeSchema) => true | string;

  getInputNode?: (ctx: TypeInputContext<TypeSchema>) => JSX.Element;
  /**
   * 自定义生成子类型的 optionValue
   */
  customChildOptionValue?: () => string[];

  /**
   * @deprecated api 已废弃，能力仍保留，请优先使用或定义 getSupportedItemTypes
   */
  getItemTypes?: (ctx: {
    level: number;
    parentTypes?: string[];
  }) => Array<{ type: string; disabled?: string }>;
}
