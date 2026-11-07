/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { useEffect, useRef } from 'react';

import { Field, FieldRenderProps } from '@flowgram.ai/free-layout-editor';
import { Input, Typography } from '@douyinfe/semi-ui';

import { Title } from './styles';
import { Feedback } from '../feedback';

const { Text } = Typography;

export function TitleInput(props: {
  readonly: boolean;
  titleEdit: boolean;
  updateTitleEdit: (setEdit: boolean) => void;
  /** 侧栏态：单击即进入编辑（画布卡片保留双击，避免误触拖拽冲突） */
  singleClickEdit?: boolean;
}): JSX.Element {
  const { readonly, titleEdit, updateTitleEdit, singleClickEdit } = props;
  const ref = useRef<any>();
  const titleEditing = titleEdit && !readonly;
  useEffect(() => {
    if (titleEditing) {
      ref.current?.focus();
    }
  }, [titleEditing]);

  return (
    <Title>
      <Field name="title">
        {({ field: { value, onChange }, fieldState }: FieldRenderProps<string>) => (
          <div style={{ height: 24 }}>
            {titleEditing ? (
              <Input
                value={value}
                onChange={onChange}
                ref={ref}
                onBlur={() => updateTitleEdit(false)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    updateTitleEdit(false);
                  }
                }}
                autoFocus
              />
            ) : (
              <div
                onDoubleClick={() => !readonly && updateTitleEdit(true)}
                onClick={() => !readonly && singleClickEdit && updateTitleEdit(true)}
                style={{ cursor: readonly ? 'default' : 'pointer' }}
              >
                <Text ellipsis={{ showTooltip: true }}>{value}</Text>
              </div>
            )}
            <Feedback errors={fieldState?.errors} />
          </div>
        )}
      </Field>
    </Title>
  );
}
