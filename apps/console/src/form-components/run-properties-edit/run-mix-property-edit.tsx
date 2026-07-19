import React, { useLayoutEffect, useState } from 'react';

import { Input } from '@douyinfe/semi-ui';

import { TypeSelector } from '../type-selector';
import { LeftColumn, Row } from './styles';

export interface PropertyItem {
  type: string;
  value?: any;
  default?: any;
  [key: string]: any;
}

export interface PropertyEditProps {
  propertyKey: string;
  value: PropertyItem;
  disabled?: boolean;
  onChange: (propertyKey: string, propertyValue: PropertyItem) => void;
}

export const RunMixPropertyEdit: React.FC<PropertyEditProps> = (props) => {
  const { value } = props;
  const [inputKey, updateKey] = useState(props.propertyKey);
  const updateValueContent = (val: string) => {
    value.default.content = val;
    props.onChange(inputKey, value);
  };
  useLayoutEffect(() => {
    updateKey(props.propertyKey);
  }, [props.propertyKey]);
  return (
    <Row>
      <LeftColumn>
        <TypeSelector
          value={value.type}
          disabled={true}
          style={{ position: 'absolute', top: 6, left: 4, zIndex: 1 }}
        />
        <Input value={inputKey} disabled={true} readOnly={true} style={{ paddingLeft: 26 }} />
      </LeftColumn>

      <Input value={value.default.content} onChange={(v) => updateValueContent(v)} />
    </Row>
  );
};
