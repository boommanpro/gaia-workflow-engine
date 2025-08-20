/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { mapValues } from '../objects';

export type SchemaType =
  | 'string'
  | 'integer'
  | 'float'
  | 'boolean'
  | 'enum'
  | 'object'
  | 'range'
  | 'color'
  | 'array';

interface SchemaMixinDefaults {
  [defaultKey: string]: any;
}
export interface SchemaDecoration<SCHEMA = any> {
  type: SchemaType;
  label?: string; // 显示的名字
  description?: string; // 更多描述，用于 tooltip 展示
  properties?: {
    [K in keyof SCHEMA]: SchemaDecoration<SCHEMA[K]> & { priority?: number };
  };
  enumValues?: (string | number)[]; // only for enum
  enumType?: string | number;
  enumLabels?: string[];
  rangeStep?: number; // range 一步大小
  max?: number; // 最大值，只适用于数字
  min?: number; // 最小值，只适用于数字
  disabled?: boolean; //  是否屏蔽
  default?: SCHEMA; // 默认值
  mixinDefaults?: SchemaMixinDefaults;
}

export namespace SchemaDecoration {
  /**
   * 扩展 SchemaDecoration
   *
   * @param properties - 定义新的属性
   * @param baseDecoration - 基类
   * @param mixinDefaults - 修改默认值
   * @example
   *    const MySchemaDecoration = SchemaDecoration.create({
   *      myProp: { label: '', default: 1, type: 'number' }
   *    },
   *    TransformSchemaDecoration, // 继承 Transform
   *    {
   *      'size.width': 100, // 修改 size 的默认值
   *      'size.height': 100,
   *    })
   */
  export function create<T>(
    properties: { [key: string]: SchemaDecoration },
    baseDecoration?: SchemaDecoration,
    mixinDefaults?: SchemaMixinDefaults,
  ): SchemaDecoration<T> {
    return {
      type: 'object',
      properties: {
        ...baseDecoration?.properties,
        ...properties,
      },
      mixinDefaults: {
        ...baseDecoration?.mixinDefaults,
        ...mixinDefaults,
      },
    } as SchemaDecoration;
  }
}

export namespace Schema {
  export function createDefault<T>(
    decoration: SchemaDecoration,
    mixinDefaults?: SchemaMixinDefaults,
    _key?: string,
  ): T {
    mixinDefaults = { ...decoration.mixinDefaults, ...mixinDefaults };
    const prefixKey = _key ? `${_key}.` : '';
    if (decoration.properties) {
      return mapValues(decoration.properties, (v, k) => {
        const childKey = prefixKey + k;
        if (mixinDefaults && mixinDefaults[childKey] !== undefined) {
          return mixinDefaults[childKey];
        }
        return createDefault(v, mixinDefaults, childKey);
      }) as T;
    }
    return typeof decoration.default === 'function' ? decoration.default() : decoration.default;
  }
  /**
   * 非 object 类
   */
  export function isBaseType(decoration: SchemaDecoration): boolean {
    return (
      decoration.type === 'string' ||
      decoration.type === 'float' ||
      decoration.type === 'integer' ||
      decoration.type === 'boolean' ||
      decoration.type === 'enum' ||
      decoration.type === 'color' ||
      decoration.type === 'range'
    );
  }
}
