import React from 'react';

import { Button, Select } from '@douyinfe/semi-ui';
import { IconCrossCircleStroked } from '@douyinfe/semi-icons';

import { FxExpression } from '../../../form-components/fx-expression';
import { ConditionItemProps } from './types';
import { ConditionItem as StyledConditionItem, ExpressionContainer } from './styles';
import { OPERATOR_OPTIONS } from './constants';

export const ConditionItem: React.FC<ConditionItemProps> = ({
  condition,
  readonly,
  showRemove,
  index,
  onUpdate,
  onRemove,
}) => (
  <StyledConditionItem>
    <Select
      value={condition.operator}
      onChange={(value) => onUpdate(['operator'], value)}
      disabled={readonly}
      style={{ width: '100px', marginRight: '10px' }}
    >
      {OPERATOR_OPTIONS.map((option) => (
        <Select.Option key={option.value} value={option.value}>
          {option.label}
        </Select.Option>
      ))}
    </Select>

    <ExpressionContainer>
      <FxExpression
        value={condition.left}
        onChange={(v) => onUpdate(['left'], v)}
        placeholder="左值"
        disabled={readonly}
        style={{ marginRight: '10px' }}
      />
      <FxExpression
        value={condition.right}
        onChange={(v) => onUpdate(['right'], v)}
        placeholder="右值"
        disabled={readonly}
        style={{ marginRight: '10px' }}
      />
    </ExpressionContainer>

    {!readonly && showRemove && (
      <Button
        theme="borderless"
        icon={<IconCrossCircleStroked />}
        onClick={onRemove}
        style={{ marginLeft: 'auto' }}
      />
    )}
  </StyledConditionItem>
);
