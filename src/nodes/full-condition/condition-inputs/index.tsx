import { nanoid } from 'nanoid';
import { Field, FieldArray } from '@flowgram.ai/free-layout-editor';
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

interface ConditionValue {
  logic: number; // 1 for AND, 2 for OR
  conditions: Array<{
    operator: number;
    left: FlowLiteralValueSchema | FlowRefValueSchema;
    right: FlowLiteralValueSchema | FlowRefValueSchema;
  }>;
}

export function ConditionInputs() {
  const readonly = !useIsSidebar();
  return (
    <FieldArray name="inputsValues.conditions">
      {({ field }) => (
        <>
          {field.map((group, groupIndex) => (
            <div
              key={group.name}
              style={{
                border: '1px solid #e0e0e0',
                borderRadius: '4px',
                padding: '10px',
                marginBottom: '10px',
              }}
            >
              <Select
                value={group.value.logic}
                onChange={(value) => field.update(groupIndex, { ...group.value, logic: value })}
                disabled={readonly}
                style={{ width: '100px', marginBottom: '10px' }}
              >
                <Select.Option value={1}>且</Select.Option>
                <Select.Option value={2}>或</Select.Option>
              </Select>

              <FieldArray name={group.name + '.conditions'}>
                {({ field: conditionField }) => (
                  <>
                    {conditionField.map((condition, conditionIndex) => (
                      <div
                        key={condition.name}
                        style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}
                      >
                        <Select
                          value={condition.value.operator}
                          onChange={(value) =>
                            conditionField.update(conditionIndex, {
                              ...condition.value,
                              operator: value,
                            })
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

                        <FxExpression
                          value={condition.value.left}
                          onChange={(v) =>
                            conditionField.update(conditionIndex, { ...condition.value, left: v })
                          }
                          placeholder="左值"
                          disabled={readonly}
                          style={{ marginRight: '10px' }}
                        />

                        <FxExpression
                          value={condition.value.right}
                          onChange={(v) =>
                            conditionField.update(conditionIndex, { ...condition.value, right: v })
                          }
                          placeholder="右值"
                          disabled={readonly}
                          style={{ marginRight: '10px' }}
                        />

                        {!readonly && (
                          <Button
                            theme="borderless"
                            icon={<IconCrossCircleStroked />}
                            onClick={() => conditionField.delete(conditionIndex)}
                            style={{ marginLeft: 'auto' }}
                          />
                        )}
                      </div>
                    ))}

                    {!readonly && (
                      <div style={{ textAlign: 'right' }}>
                        <Button
                          theme="borderless"
                          icon={<IconPlus />}
                          onClick={() =>
                            conditionField.append({
                              operator: 1,
                              left: { type: 'expression', content: '' },
                              right: { type: 'expression', content: '' },
                            })
                          }
                        >
                          添加条件
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </FieldArray>

              {!readonly && (
                <Button
                  theme="borderless"
                  icon={<IconCrossCircleStroked />}
                  onClick={() => field.delete(groupIndex)}
                  style={{ float: 'right', marginTop: '-25px' }}
                />
              )}
            </div>
          ))}

          {!readonly && (
            <div style={{ textAlign: 'right' }}>
              <Button
                theme="borderless"
                icon={<IconPlus />}
                onClick={() =>
                  field.append({
                    logic: 1,
                    conditions: [
                      {
                        operator: 1,
                        left: { type: 'expression', content: '' },
                        right: { type: 'expression', content: '' },
                      },
                    ],
                  })
                }
              >
                添加逻辑组
              </Button>
            </div>
          )}
        </>
      )}
    </FieldArray>
  );
}
