/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import React, { useEffect, useState } from 'react';

import { Input, InputProps } from 'antd';

export function BlurInput(props: InputProps) {
  const [value, setValue] = useState('');

  useEffect(() => {
    setValue(props.value as string);
  }, [props.value]);

  return (
    <Input
      {...props}
      value={value}
      onChange={(value) => {
        setValue((value as any).target?.value || '');
      }}
    />
  );
}
