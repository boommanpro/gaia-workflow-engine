import React, { useLayoutEffect, useState } from 'react';

import { Button, Input } from '@douyinfe/semi-ui';
import { IconCrossCircleStroked } from '@douyinfe/semi-icons';

import { TypeSelector } from '../type-selector';
import { LeftColumn, Row } from './styles';
import { FxNewExpression } from '../fx-new-expression';
import { JsonSchema } from '../../typings';

export interface PropertyEditProps {
  propertyKey: string;
  value: JsonSchema;
  onlyFieldName?: boolean;
  disabled?: boolean;
  onChange: (value: JsonSchema, propertyKey: string, newPropertyKey?: string) => void;
  onDelete?: () => void;
}

export const MixPropertyEdit: React.FC<PropertyEditProps> = (props) => {
  const { value, disabled } = props;
  const [inputKey, updateKey] = useState(props.propertyKey);
  const updateProperty = (key: keyof JsonSchema, val: any) => {
    value[key] = val;
    props.onChange(value, props.propertyKey);
  };
  useLayoutEffect(() => {
    updateKey(props.propertyKey);
  }, [props.propertyKey]);
  return (
    <Row>
      <LeftColumn>
        <TypeSelector
          value={value.type}
          disabled={disabled}
          style={{ position: 'absolute', top: 6, left: 4, zIndex: 1 }}
          onChange={(val) => updateProperty('type', val)}
        />
        <Input
          value={inputKey}
          disabled={disabled}
          onChange={(v) => updateKey(v.trim())}
          onBlur={() => {
            if (inputKey !== '') {
              props.onChange(value, props.propertyKey, inputKey);
            } else {
              updateKey(props.propertyKey);
            }
          }}
          style={{ paddingLeft: 26 }}
        />
      </LeftColumn>
      {!props.onlyFieldName && (
        <>
          <FxNewExpression
            value={value.default}
            onChange={(val) => updateProperty('default', val)}
          />
          {props.onDelete && !disabled && (
            <Button theme="borderless" icon={<IconCrossCircleStroked />} onClick={props.onDelete} />
          )}
        </>
      )}
    </Row>
  );
};
