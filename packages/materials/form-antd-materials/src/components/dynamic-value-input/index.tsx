import React, { useMemo } from 'react';

import { theme } from 'antd';
import { SettingFilled } from '@ant-design/icons';

import { VariableSelector } from '../variable-selector';
import { Strategy } from '../constant-input/types';
import { ConstantInput } from '../constant-input';
import { IFlowConstantRefValue } from '../../typings/flow-value';
import { IJsonSchema } from '../../typings';
import { UIContainer, UIMain, UITrigger } from './styles';

const { useToken } = theme;

interface PropsType {
  value?: IFlowConstantRefValue;
  onChange: (value?: IFlowConstantRefValue) => void;
  readonly?: boolean;
  hasError?: boolean;
  style?: React.CSSProperties;
  schema?: IJsonSchema;
  constantProps?: {
    strategies?: Strategy[];
    [key: string]: any;
  };
}

export function DynamicValueInput({
  value,
  onChange,
  readonly,
  style,
  schema,
  constantProps,
}: PropsType) {
  const { token } = useToken();

  // When is number type, include integer as well
  const includeSchema = useMemo(() => {
    if (schema?.type === 'number') {
      return [schema, { type: 'integer' }];
    }
    return schema;
  }, [schema]);

  const renderMain = () => {
    if (value?.type === 'ref') {
      // Display Variable Or Delete
      return (
        <VariableSelector
          style={{ width: '100%' }}
          value={value?.content}
          onChange={(_v) => onChange(_v ? { type: 'ref', content: _v } : undefined)}
          includeSchema={includeSchema}
          readonly={readonly}
        />
      );
    }

    return (
      <ConstantInput
        value={value?.content}
        onChange={(_v) => onChange({ type: 'constant', content: _v })}
        schema={schema || { type: 'string' }}
        readonly={readonly}
        {...constantProps}
      />
    );
  };

  const renderTrigger = () => (
    <VariableSelector
      style={{ width: '100%' }}
      value={value?.type === 'ref' ? value?.content : undefined}
      onChange={(_v) => onChange({ type: 'ref', content: _v })}
      includeSchema={includeSchema}
      readonly={readonly}
      triggerRender={() => <SettingFilled style={{ color: token.colorPrimary }} />}
    />
  );

  return (
    <UIContainer style={style}>
      <UIMain>{renderMain()}</UIMain>
      <UITrigger>{renderTrigger()}</UITrigger>
    </UIContainer>
  );
}
