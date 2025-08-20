/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';

import type { AutosizeRow } from '@douyinfe/semi-ui/lib/es/input/textarea';
import { TextArea } from '@douyinfe/semi-ui';

interface Props {
  value: string | undefined;
  onChange: (data: string | undefined) => void;
  onBlur: () => void;
  onFocus?: () => void;
  onSubmit?: () => void;
  editing?: boolean;
  autoSize?: AutosizeRow | boolean;
  // eslint-disable-next-line
  [key: string]: any;
}

const BaseTextarea: React.FC<Props> = (props) => {
  const { value, onChange, onBlur, editing, onFocus, autoSize = true, ...rest } = props;

  const [data, setData] = useState(value);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const onSubmit = useCallback(() => {
    onChange(data);
    onBlur?.();
  }, [data, onChange]);

  const handleBlur = () => {
    onBlur?.();
    onSubmit?.();
  };

  useEffect(() => {
    setData(value);
  }, [value]);

  useEffect(() => {
    if (textareaRef.current && editing) {
      textareaRef.current?.focus();
    }
  }, [editing]);

  return (
    <TextArea
      {...rest}
      ref={textareaRef}
      value={data}
      onChange={(v) => {
        setData(v);
      }}
      onEnterPress={onSubmit}
      onBlur={handleBlur}
      onFocus={onFocus}
      autosize={autoSize}
      rows={1}
      className={'base-textarea'}
    />
  );
};

export default BaseTextarea;
