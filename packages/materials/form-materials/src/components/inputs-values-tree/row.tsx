/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import React, { useMemo, useState } from 'react';

import { I18n } from '@flowgram.ai/editor';
import { IconButton, Input } from '@douyinfe/semi-ui';
import { IconChevronDown, IconChevronRight, IconDelete } from '@douyinfe/semi-icons';

import { IFlowConstantValue } from '@/shared';
import { ConstantInputStrategy } from '@/components/constant-input';

import { PropsType } from './types';
import {
  IconAddChildren,
  UIActions,
  UICollapseTrigger,
  UICollapsible,
  UIRow,
  UITreeItemLeft,
  UITreeItemMain,
  UITreeItemRight,
  UITreeItems,
} from './styles';
import { useChildList } from './hooks/use-child-list';
import { InjectDynamicValueInput } from '../dynamic-value-input';
import { BlurInput } from '../blur-input';

const AddObjectChildStrategy: ConstantInputStrategy = {
  hit: (schema) => schema.type === 'object',
  Renderer: () => (
    <Input
      size="small"
      disabled
      style={{ pointerEvents: 'none' }}
      value={I18n.t('Configure via child fields')}
    />
  ),
};

export function InputValueRow(
  props: {
    keyName?: string;
    value?: any;
    onUpdateKey: (key: string) => void;
    onUpdateValue: (value: any) => void;
    onRemove?: () => void;
    $isLast?: boolean;
    $level?: number;
  } & Pick<PropsType, 'constantProps' | 'hasError' | 'readonly'>
) {
  const {
    keyName,
    value,
    $level = 0,
    onUpdateKey,
    onUpdateValue,
    $isLast,
    onRemove,
    constantProps,
    hasError,
    readonly,
  } = props;
  const [collapse, setCollapse] = useState(false);

  const { canAddField, hasChildren, list, add, updateKey, updateValue, remove } = useChildList(
    value,
    onUpdateValue
  );

  const strategies = useMemo(
    () => [...(hasChildren ? [AddObjectChildStrategy] : []), ...(constantProps?.strategies || [])],
    [hasChildren, constantProps?.strategies]
  );

  const flowDisplayValue = useMemo(
    () =>
      hasChildren
        ? ({
            type: 'constant',
            schema: { type: 'object' },
          } as IFlowConstantValue)
        : value,
    [hasChildren, value]
  );

  return (
    <>
      <UITreeItemLeft $isLast={$isLast} $showLine={$level > 0} $showCollapse={hasChildren}>
        {hasChildren && (
          <UICollapseTrigger onClick={() => setCollapse((_collapse) => !_collapse)}>
            {collapse ? <IconChevronDown size="small" /> : <IconChevronRight size="small" />}
          </UICollapseTrigger>
        )}
      </UITreeItemLeft>
      <UITreeItemRight>
        <UITreeItemMain>
          <UIRow>
            <BlurInput
              style={{ width: 100, minWidth: 100, maxWidth: 100 }}
              disabled={readonly}
              size="small"
              value={keyName}
              onChange={(v) => onUpdateKey?.(v)}
              placeholder={I18n.t('Input Key')}
            />
            <InjectDynamicValueInput
              style={{ flexGrow: 1 }}
              readonly={readonly}
              value={flowDisplayValue}
              onChange={(v) => onUpdateValue(v)}
              hasError={hasError}
              constantProps={{
                ...constantProps,
                strategies,
              }}
            />
            <UIActions>
              {canAddField && (
                <IconButton
                  disabled={readonly}
                  size="small"
                  theme="borderless"
                  icon={<IconAddChildren />}
                  onClick={() => {
                    add({
                      type: 'constant',
                      content: '',
                      schema: { type: 'string' },
                    });
                    setCollapse(true);
                  }}
                />
              )}
              <IconButton
                disabled={readonly}
                theme="borderless"
                icon={<IconDelete size="small" />}
                size="small"
                onClick={() => onRemove?.()}
              />
            </UIActions>
          </UIRow>
        </UITreeItemMain>
        {hasChildren && (
          <UICollapsible $collapse={collapse}>
            <UITreeItems $shrink={true}>
              {list.map((_item, index) => (
                <InputValueRow
                  readonly={readonly}
                  hasError={hasError}
                  constantProps={constantProps}
                  key={_item.id}
                  keyName={_item.key}
                  value={_item.value}
                  $level={$level + 1} // 传递递增的层级
                  onUpdateValue={(_v) => {
                    updateValue(_item.id, _v);
                  }}
                  onUpdateKey={(k) => {
                    updateKey(_item.id, k);
                  }}
                  onRemove={() => {
                    remove(_item.id);
                  }}
                  $isLast={index === list.length - 1}
                />
              ))}
            </UITreeItems>
          </UICollapsible>
        )}
      </UITreeItemRight>
    </>
  );
}
