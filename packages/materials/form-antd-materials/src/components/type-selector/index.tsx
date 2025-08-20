import React, { useMemo } from 'react';

import { Cascader } from 'antd';

import { IJsonSchema } from '../../typings';
import { ArrayIcons, VariableTypeIcons, getSchemaIcon } from './constants';

interface PropTypes {
  value?: Partial<IJsonSchema>;
  onChange: (value?: Partial<IJsonSchema>) => void;
  disabled?: boolean;
  style?: React.CSSProperties;
}

export const getTypeSelectValue = (value?: Partial<IJsonSchema>): string[] | undefined => {
  if (value?.type === 'array' && value?.items) {
    return [value.type, ...(getTypeSelectValue(value.items) || [])];
  }

  return value?.type ? [value.type] : undefined;
};

export const parseTypeSelectValue = (value?: string[]): Partial<IJsonSchema> | undefined => {
  const [type, ...subTypes] = value || [];

  if (type === 'array') {
    return { type: 'array', items: parseTypeSelectValue(subTypes) };
  }

  return { type };
};

export function TypeSelector(props: PropTypes) {
  const { value, onChange, disabled } = props;

  const selectValue = useMemo(() => getTypeSelectValue(value), [value]);

  return (
    <Cascader
      disabled={disabled}
      size="small"
      // TODO
      // triggerRender={() => (
      //   <Button size="small" style={style}>
      //     {getSchemaIcon(value)}
      //   </Button>
      // )}
      // treeData={options}
      value={selectValue}
      // leafOnly={true}
      onChange={(value) => {
        onChange(parseTypeSelectValue(value as string[]));
      }}
    />
  );
}

export { ArrayIcons, VariableTypeIcons, getSchemaIcon };
