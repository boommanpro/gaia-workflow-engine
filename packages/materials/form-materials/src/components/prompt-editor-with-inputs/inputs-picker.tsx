/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import React, { useMemo } from 'react';

import { isPlainObject, last } from 'lodash';
import {
  type ArrayType,
  ASTMatch,
  type BaseType,
  type BaseVariableField,
  useScopeAvailable,
} from '@flowgram.ai/editor';
import { TreeNodeData } from '@douyinfe/semi-ui/lib/es/tree';
import { Tree } from '@douyinfe/semi-ui';

import { FlowValueUtils } from '@/shared';

type VariableField = BaseVariableField<{ icon?: string | JSX.Element; title?: string }>;

export function InputsPicker({
  inputsValues,
  onSelect,
}: {
  inputsValues: any;
  onSelect: (v: string) => void;
}) {
  const available = useScopeAvailable();

  const getArrayDrilldown = (type: ArrayType, depth = 1): { type: BaseType; depth: number } => {
    if (ASTMatch.isArray(type.items)) {
      return getArrayDrilldown(type.items, depth + 1);
    }

    return { type: type.items, depth: depth };
  };

  const renderVariable = (variable: VariableField, keyPath: string[]): TreeNodeData => {
    let type = variable?.type;

    let children: TreeNodeData[] | undefined;

    if (ASTMatch.isObject(type)) {
      children = (type.properties || [])
        .map((_property) => renderVariable(_property as VariableField, [...keyPath, _property.key]))
        .filter(Boolean) as TreeNodeData[];
    }

    if (ASTMatch.isArray(type)) {
      const drilldown = getArrayDrilldown(type);

      if (ASTMatch.isObject(drilldown.type)) {
        children = (drilldown.type.properties || [])
          .map((_property) =>
            renderVariable(_property as VariableField, [
              ...keyPath,
              ...new Array(drilldown.depth).fill('[0]'),
              _property.key,
            ])
          )
          .filter(Boolean) as TreeNodeData[];
      }
    }

    const key = keyPath
      .map((_key, idx) => (_key === '[0]' || idx === 0 ? _key : `.${_key}`))
      .join('');

    return {
      key: key,
      label: last(keyPath),
      value: key,
      children,
    };
  };

  const getTreeData = (value: any, keyPath: string[]): TreeNodeData | undefined => {
    const currKey = keyPath.join('.');

    if (FlowValueUtils.isFlowValue(value)) {
      if (FlowValueUtils.isRef(value)) {
        const variable = available.getByKeyPath(value.content || []);
        if (variable) {
          return renderVariable(variable, keyPath);
        }
      }
      return {
        key: currKey,
        value: currKey,
        label: last(keyPath),
      };
    }

    if (isPlainObject(value)) {
      return {
        key: currKey,
        value: currKey,
        label: last(keyPath),
        children: Object.entries(value)
          .map(([key, value]) => getTreeData(value, [...keyPath, key])!)
          .filter(Boolean),
      };
    }
  };

  const treeData: TreeNodeData[] = useMemo(
    () =>
      Object.entries(inputsValues)
        .map(([key, value]) => getTreeData(value, [key])!)
        .filter(Boolean),
    []
  );

  return <Tree treeData={treeData} onSelect={(v) => onSelect(v)} />;
}
