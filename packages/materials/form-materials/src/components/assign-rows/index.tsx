/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import React from 'react';

import { FieldArray, FieldArrayRenderProps } from '@flowgram.ai/editor';
import { Button } from '@douyinfe/semi-ui';
import { IconPlus } from '@douyinfe/semi-icons';

import { AssignRow, AssignValueType } from '@/components/assign-row';

interface AssignRowsProps {
  name: string;
  readonly?: boolean;
}

export function AssignRows(props: AssignRowsProps) {
  const { name, readonly } = props;

  return (
    <FieldArray name={name}>
      {({ field }: FieldArrayRenderProps<AssignValueType | undefined>) => (
        <>
          {field.map((childField, index) => (
            <AssignRow
              key={childField.key}
              readonly={readonly}
              value={childField.value}
              onChange={(value) => {
                childField.onChange(value);
              }}
              onDelete={() => field.remove(index)}
            />
          ))}
          <div style={{ display: 'flex', gap: 5 }}>
            <Button
              size="small"
              theme="borderless"
              icon={<IconPlus />}
              onClick={() => field.append({ operator: 'assign' })}
            >
              Assign
            </Button>
            <Button
              size="small"
              theme="borderless"
              icon={<IconPlus />}
              onClick={() => field.append({ operator: 'declare' })}
            >
              Declaration
            </Button>
          </div>
        </>
      )}
    </FieldArray>
  );
}
