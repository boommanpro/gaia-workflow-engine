import React, { useLayoutEffect, useState } from 'react';

import { Button, Input } from '@douyinfe/semi-ui';
import { IconCrossCircleStroked } from '@douyinfe/semi-icons';

import { TypeSelector } from '../type-selector';
import { LeftColumn, Row } from './styles';
import { FxNewExpression } from '../fx-new-expression';

interface PropertyItem {
  type: string;
  value?: any;
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
