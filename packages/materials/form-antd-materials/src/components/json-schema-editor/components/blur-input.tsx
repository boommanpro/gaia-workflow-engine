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
