/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import React from 'react';

import { I18n } from '@flowgram.ai/editor';
import { Button, Input } from '@douyinfe/semi-ui';
import { IconDelete, IconPlus } from '@douyinfe/semi-icons';

import { useObjectList } from '@/hooks';
import { InjectVariableSelector } from '@/components/variable-selector';

import { PropsType } from './types';
import './styles.css';

export function BatchOutputs(props: PropsType) {
  const { readonly, style } = props;

  const { list, add, updateKey, updateValue, remove } = useObjectList(props);

  return (
    <div>
      <div className="gedit-m-batch-outputs-rows" style={style}>
        {list.map((item) => (
          <div className="gedit-m-batch-outputs-row" key={item.id}>
            <Input
              style={{ width: 100 }}
              disabled={readonly}
              size="small"
              value={item.key}
              onChange={(v) => updateKey(item.id, v)}
            />
            <InjectVariableSelector
              style={{ flexGrow: 1 }}
              readonly={readonly}
              value={item.value?.content}
              onChange={(v) => updateValue(item.id, { type: 'ref', content: v })}
            />
            <Button
              disabled={readonly}
              icon={<IconDelete />}
              size="small"
              onClick={() => remove(item.id)}
            />
          </div>
        ))}
      </div>
      <Button disabled={readonly} icon={<IconPlus />} size="small" onClick={() => add()}>
        {I18n.t('Add')}
      </Button>
    </div>
  );
}
