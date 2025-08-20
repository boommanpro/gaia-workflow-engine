/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import type React from 'react';

import { IJsonSchema } from '@flowgram.ai/json-schema';
import {
  CascaderProps,
  type CascaderData as OriginCascaderData,
} from '@douyinfe/semi-ui/lib/es/cascader';

import { DisableTypeInfo } from '../../types';
import { TypeRegistryCreatorsAdapter } from '../../contexts';

export interface Props<TypeSchema extends Partial<IJsonSchema>>
  extends Omit<CascaderProps, 'value' | 'onChange' | 'triggerRender'> {
  /**
   *
   */
  value?: TypeSchema;

  /**
   * 禁用类型
   */
  disableTypes?: Array<DisableTypeInfo>;

  onChange?: (
    val: TypeSchema | undefined,
    ctx: {
      source: 'type-selector' | 'custom-panel';
    }
  ) => void;
  triggerRender?: () => JSX.Element;
  /**
   *
   */
  typeRegistryCreators?: TypeRegistryCreatorsAdapter<TypeSchema>[];
}

export type CascaderData = OriginCascaderData & {
  originType: string;
  text: string;
  extra: {
    label: string;
    icon: React.JSX.Element;
  };
};

export interface CascaderOption {
  label: string | JSX.Element;
  value: string;
  type: string;
  disabled?: string;
  source?: string;
  isLeaf?: boolean;
}

export interface SearchResultItem {
  value: string;
  type: string;
  icon: JSX.Element;
  level: number;
  disabled?: string;
}

export interface TypeSelectorRef {
  /**
   * 清除 item
   */
  clearFocusItem: () => void;
  /**
   * 初始化 item
   */
  initFocusItem: () => void;
  /**
   * 将当前激活的 item 向上移动
   */
  moveFocusItemUp: () => void;
  /**
   * 将当前激活的 item 向下移动
   */
  moveFocusItemDown: () => void;
  /**
   * 将当前激活的 item 向左移动，并关闭子项
   */
  moveFocusItemLeft: () => void;
  /**
   * 将当前激活的 item 向右移动，并展开子项
   */
  moveFocusItemRight: () => void;
  /**
   * 选择当前激活的 item
   */
  selectFocusItem: () => void;
}
