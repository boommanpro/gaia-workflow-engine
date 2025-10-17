/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { useRef, useEffect } from 'react';

import { Field, FieldRenderProps } from '@flowgram.ai/free-layout-editor';
import { BlurInput } from '@flowgram.ai/form-materials';
import { Typography } from '@douyinfe/semi-ui';

import { Title } from './styles';
const { Text } = Typography;

export function TitleInput(props: {
  titleEdit: boolean;
  updateTitleEdit: (setEdit: boolean) => void;
}): JSX.Element {
  const { titleEdit, updateTitleEdit } = props;

  const ref = useRef<any>();
  useEffect(() => {
    if (titleEdit) {
      ref.current?.focus();
    }
  }, [titleEdit]);
  return (
    <Title>
      <Field name="title">
        {({ field: { value, onChange }, fieldState }: FieldRenderProps<string>) => (
          <div style={{ height: 24 }}>
            {titleEdit ? (
              <BlurInput
                ref={ref}
                value={value}
                onChange={(v) => {
                  onChange(v);
                }}
                onBlur={() => {
                  updateTitleEdit(false);
                }}
              />
            ) : (
              <Text ellipsis={{ showTooltip: true }}>{value}</Text>
            )}
          </div>
        )}
      </Field>
    </Title>
  );
}
