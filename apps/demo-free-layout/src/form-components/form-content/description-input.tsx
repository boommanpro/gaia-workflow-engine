/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { useEffect, useRef, useState } from 'react';

import { Input, Typography } from '@douyinfe/semi-ui';

import { FormTitleDescription } from './styles';

const { Text } = Typography;
const { TextArea } = Input;

interface DescriptionInputProps {
  readonly: boolean;
  description: string;
  onDescriptionChange: (description: string) => void;
}

export function DescriptionInput({
  readonly,
  description,
  onDescriptionChange,
}: DescriptionInputProps): JSX.Element {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(description);
  const ref = useRef<any>();

  useEffect(() => {
    setValue(description);
  }, [description]);

  useEffect(() => {
    if (editing && ref.current) {
      ref.current.focus();
    }
  }, [editing]);

  const handleSave = () => {
    onDescriptionChange(value);
    setEditing(false);
  };

  if (readonly) {
    return <FormTitleDescription>{description}</FormTitleDescription>;
  }

  return (
    <FormTitleDescription>
      {editing ? (
        <TextArea
          ref={ref}
          value={value}
          onChange={setValue}
          onBlur={handleSave}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && e.ctrlKey) {
              handleSave();
            }
          }}
          autoFocus
          rows={3}
          style={{ width: '100%' }}
        />
      ) : (
        <div
          onDoubleClick={() => !readonly && setEditing(true)}
          style={{ cursor: readonly ? 'default' : 'pointer' }}
        >
          <Text ellipsis={{ showTooltip: { opts: { content: description } }, rows: 2 }}>
            {description}
          </Text>
        </div>
      )}
    </FormTitleDescription>
  );
}
