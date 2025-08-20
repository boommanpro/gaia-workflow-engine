import React, { useLayoutEffect, useState } from 'react';

import { Button, Input } from 'antd';
import { DynamicValueInput, TypeSelector } from '@flowgram.ai/form-antd-materials';
import { CloseCircleOutlined } from '@ant-design/icons';

import { JsonSchema } from '@editor/typings';
import { LeftColumn, Row } from './styles';

export interface PropertyEditProps {
  propertyKey: string;
  value: JsonSchema;
  useFx?: boolean;
  disabled?: boolean;
  onChange: (value: JsonSchema, propertyKey: string, newPropertyKey?: string) => void;
  onDelete?: () => void;
}

export const PropertyEdit: React.FC<PropertyEditProps> = (props) => {
  const { value, disabled } = props;
  const [inputKey, updateKey] = useState(props.propertyKey);
  const updateProperty = (key: keyof JsonSchema, val: any) => {
    value[key] = val;
    props.onChange(value, props.propertyKey);
  };

  const partialUpdateProperty = (val?: Partial<JsonSchema>) => {
    props.onChange({ ...value, ...val }, props.propertyKey);
  };

  useLayoutEffect(() => {
    updateKey(props.propertyKey);
  }, [props.propertyKey]);
  return (
    <Row>
      <LeftColumn>
        <TypeSelector
          value={value}
          disabled={disabled}
          style={{
            position: 'absolute',
            top: 2,
            left: 4,
            zIndex: 1,
            padding: '0 5px',
            height: 20,
          }}
          onChange={(val) => partialUpdateProperty(val)}
        />
        <Input
          value={inputKey}
          disabled={disabled}
          size="small"
          // onChange={(v) => updateKey(v.trim())}
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
      {
        <DynamicValueInput
          value={value.default}
          onChange={(val) => updateProperty('default', val)}
          schema={value}
          style={{ flexGrow: 1 }}
        />
      }
      {props.onDelete && !disabled && (
        <Button
          style={{ marginLeft: 5, position: 'relative', top: 2 }}
          size="small"
          // theme="borderless"
          icon={<CloseCircleOutlined />}
          onClick={props.onDelete}
        />
      )}
    </Row>
  );
};
