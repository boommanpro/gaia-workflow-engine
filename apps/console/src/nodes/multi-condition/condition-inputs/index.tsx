/**
 * Multi-Condition Inputs
 * Synced from official flowgram.ai free-feature-overview example
 * Supports multiple branches with AND/OR logic between conditions
 */

import { useLayoutEffect } from 'react';
import { Field, FieldArray, I18n } from '@flowgram.ai/free-layout-editor';
import { ConditionRow, ConditionRowValueType } from '@flowgram.ai/form-materials';
import { Button, Select } from '@douyinfe/semi-ui';
import { IconCrossCircleStroked, IconPlus } from '@douyinfe/semi-icons';

import { generateValidId } from '../../../nodes/utils';
import { useIsSidebar, useNodeRenderContext } from '../../../hooks';
import { Feedback, FormItem } from '../../../form-components';
import { ConditionPort, ConditionBranch, ConditionBranchLogic } from './styles';

interface ConditionValue {
  key: string;
  value?: ConditionRowValueType;
}

interface BranchValue {
  logic: 'and' | 'or';
  conditions: ConditionValue[];
}

export function ConditionInputs() {
  const { node, readonly } = useNodeRenderContext();
  const isSidebar = useIsSidebar();

  useLayoutEffect(() => {
    window.requestAnimationFrame(() => {
      node.ports.updateDynamicPorts();
    });
  }, [node]);

  return (
    <FieldArray name="branch">
      {({ field }) => (
        <>
          {field.map((branch, branchIndex) => (
            <Field<BranchValue> key={branch.name} name={branch.name}>
              {({ field: branchField, fieldState: branchState }) => (
                <FormItem
                  name={branchField.value.logic === 'and' ? 'and' : 'or'}
                  type="boolean"
                  required={true}
                  labelWidth={50}
                >
                  <ConditionBranch>
                    <ConditionBranchLogic>
                      <Field name={`${branch.name}.logic`}>
                        {({ field: logicField }) => (
                          <Select
                            disabled={readonly}
                            value={logicField.value || 'and'}
                            onChange={(v) => logicField.onChange(v as 'and' | 'or')}
                            style={{ width: 70, position: 'relative', zIndex: 2 }}
                            size="small"
                          >
                            <Select.Option value="and">AND</Select.Option>
                            <Select.Option value="or">OR</Select.Option>
                          </Select>
                        )}
                      </Field>
                    </ConditionBranchLogic>

                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <FieldArray name={`${branch.name}.conditions`}>
                        {({ field: condField }) => (
                          <>
                            {condField.map((child, condIndex) => (
                              <Field<ConditionValue> key={child.name} name={child.name}>
                                {({ field: childField, fieldState: childState }) => (
                                  <div style={{ display: 'flex', alignItems: 'center' }}>
                                    <ConditionRow
                                      readonly={readonly}
                                      style={{ flexGrow: 1, overflow: 'hidden' }}
                                      value={childField.value?.value}
                                      onChange={(v) =>
                                        childField.onChange({
                                          value: v,
                                          key: childField.value?.key || generateValidId('condition', 5),
                                        })
                                      }
                                    />
                                    {!readonly && condField.length > 1 && (
                                      <Button
                                        theme="borderless"
                                        disabled={readonly}
                                        icon={<IconCrossCircleStroked />}
                                        onClick={() => condField.delete(condIndex)}
                                      />
                                    )}
                                    <Feedback errors={childState?.errors} invalid={childState?.invalid} />
                                    <ConditionPort
                                      data-port-id={childField.value?.key}
                                      data-port-type="output"
                                    />
                                  </div>
                                )}
                              </Field>
                            ))}
                            {isSidebar && !readonly && (
                              <Button
                                theme="borderless"
                                icon={<IconPlus />}
                                onClick={() =>
                                  condField.append({
                                    key: generateValidId('condition', 5),
                                    value: { type: 'expression', content: '' },
                                  })
                                }
                              >
                                {I18n.t('Add condition')}
                              </Button>
                            )}
                          </>
                        )}
                      </FieldArray>
                    </div>

                    {!readonly && (
                      <Button
                        theme="borderless"
                        disabled={readonly}
                        icon={<IconCrossCircleStroked />}
                        onClick={() => field.delete(branchIndex)}
                      />
                    )}
                  </ConditionBranch>
                  <Feedback errors={branchState?.errors} invalid={branchState?.invalid} />
                </FormItem>
              )}
            </Field>
          ))}

          {/* Else port */}
          <FormItem name="else" type="boolean" required={true} labelWidth={100}>
            <ConditionPort data-port-id="else" data-port-type="output" />
          </FormItem>

          {isSidebar && !readonly && (
            <div>
              <Button
                theme="borderless"
                icon={<IconPlus />}
                onClick={() =>
                  field.append({
                    logic: 'and',
                    conditions: [
                      {
                        key: generateValidId('condition', 5),
                        value: { type: 'expression', content: '' },
                      },
                    ],
                  })
                }
              >
                {I18n.t('Add branch')}
              </Button>
            </div>
          )}
        </>
      )}
    </FieldArray>
  );
}
