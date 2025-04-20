import { useState } from 'react';

import { nanoid } from 'nanoid';
import { FieldArray } from '@flowgram.ai/free-layout-editor';
import { Button, Select, Input } from '@douyinfe/semi-ui';
import { IconPlus, IconCrossCircleStroked } from '@douyinfe/semi-icons';

import { FlowLiteralValueSchema, FlowRefValueSchema } from '../../../typings';
import { useIsSidebar } from '../../../hooks';
import { FxExpression } from '../../../form-components/fx-expression';
import { FormItem } from '../../../form-components';
import { Feedback } from '../../../form-components';
import { ConditionPort } from './styles';

// Define operator options
const OPERATOR_OPTIONS = [
  { value: 1, label: '=' },
  { value: 2, label: '!=' },
  { value: 3, label: '>' },
  { value: 4, label: '<' },
  { value: 5, label: '>=' },
  { value: 6, label: '<=' },
  { value: 7, label: 'contains' },
  { value: 8, label: 'not contains' },
  // Add more operators as needed
];

interface Condition {
  operator: number;
  left: FlowLiteralValueSchema | FlowRefValueSchema;
  right: FlowLiteralValueSchema | FlowRefValueSchema;
}

interface ConditionValue {
  logic: number; // 1 for AND, 2 for OR
  conditions: Condition[];
}

export function ConditionInputs() {
  const readonly = !useIsSidebar();
  const [conditions, setConditions] = useState<ConditionValue[]>([
    {
      logic: 1,
      conditions: [
        {
          operator: 1,
          left: { type: 'expression', content: '' },
          right: { type: 'expression', content: '' },
        },
      ],
    },
  ]);

  // Update logic group
  const updateGroup = (groupIndex: number, updatedGroup: ConditionValue) => {
    const newConditions = [...conditions];
    newConditions[groupIndex] = updatedGroup;
    setConditions(newConditions);
  };

  // Delete logic group
  const deleteGroup = (groupIndex: number) => {
    const newConditions = conditions.filter((_, index) => index !== groupIndex);
    setConditions(newConditions);
  };

  // Update condition
  const updateCondition = (
    groupIndex: number,
    conditionIndex: number,
    updatedCondition: Condition
  ) => {
    const newConditions = [...conditions];
    newConditions[groupIndex].conditions[conditionIndex] = updatedCondition;
    setConditions(newConditions);
  };

  // Delete condition
  const deleteCondition = (groupIndex: number, conditionIndex: number) => {
    const newConditions = [...conditions];
    newConditions[groupIndex].conditions.splice(conditionIndex, 1);
    setConditions(newConditions);
  };

  // Append new logic group
  const appendGroup = () => {
    setConditions([
      ...conditions,
      {
        logic: 1,
        conditions: [
          {
            operator: 1,
            left: { type: 'expression', content: '' },
            right: { type: 'expression', content: '' },
          },
        ],
      },
    ]);
  };

  // Append new condition
  const appendCondition = (groupIndex: number) => {
    const newConditions = [...conditions];
    newConditions[groupIndex].conditions.push({
      operator: 1,
      left: { type: 'expression', content: '' },
      right: { type: 'expression', content: '' },
    });
    setConditions(newConditions);
  };

  return (
    <>
      {conditions.map((group, groupIndex) => (
        <div
          key={nanoid()}
          style={{
            border: '1px solid #e0e0e0',
            borderRadius: '4px',
            position: 'relative',
          }}
        >
          {!readonly && (
            <div
              style={{
                right: '0px',
                position: 'absolute',
              }}
            >
              <Button
                theme="borderless"
                icon={<IconCrossCircleStroked />}
                onClick={() => deleteGroup(groupIndex)}
              />
            </div>
          )}
          <div
            style={{
              padding: '10px',
              marginBottom: '10px',
              display: 'flex',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '10px',
              }}
            >
              {group.conditions.length > 1 && (
                <Select
                  value={group.logic}
                  onChange={(value) => updateGroup(groupIndex, { ...group, logic: value })}
                  disabled={readonly}
                  style={{ width: '100px' }}
                >
                  <Select.Option value={1}>且</Select.Option>
                  <Select.Option value={2}>或</Select.Option>
                </Select>
              )}
            </div>

            <div>
              {group.conditions.map((condition, conditionIndex) => (
                <div
                  key={nanoid()}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    marginBottom: '10px',
                  }}
                >
                  <Select
                    value={condition.operator}
                    onChange={(value) =>
                      updateCondition(groupIndex, conditionIndex, { ...condition, operator: value })
                    }
                    disabled={readonly}
                    style={{ width: '100px', marginRight: '10px' }}
                  >
                    {OPERATOR_OPTIONS.map((option) => (
                      <Select.Option key={option.value} value={option.value}>
                        {option.label}
                      </Select.Option>
                    ))}
                  </Select>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <FxExpression
                      value={condition.left}
                      onChange={(v) =>
                        updateCondition(groupIndex, conditionIndex, { ...condition, left: v })
                      }
                      placeholder="左值"
                      disabled={readonly}
                      style={{ marginRight: '10px' }}
                    />

                    <FxExpression
                      value={condition.right}
                      onChange={(v) =>
                        updateCondition(groupIndex, conditionIndex, { ...condition, right: v })
                      }
                      placeholder="右值"
                      disabled={readonly}
                      style={{ marginRight: '10px' }}
                    />
                  </div>

                  {!readonly && (
                    <Button
                      theme="borderless"
                      icon={<IconCrossCircleStroked />}
                      onClick={() => deleteCondition(groupIndex, conditionIndex)}
                      style={{ marginLeft: 'auto' }}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
          {!readonly && (
            <div style={{ textAlign: 'right' }}>
              <Button
                theme="borderless"
                icon={<IconPlus />}
                onClick={() => appendCondition(groupIndex)}
              >
                添加条件
              </Button>
            </div>
          )}
        </div>
      ))}

      {!readonly && (
        <div style={{ textAlign: 'right' }}>
          <Button theme="borderless" icon={<IconPlus />} onClick={appendGroup}>
            添加逻辑组
          </Button>
        </div>
      )}
    </>
  );
}
