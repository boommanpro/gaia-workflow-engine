/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { Fragment, useLayoutEffect, useState } from 'react';

import { Field, FieldArray, I18n, WorkflowNodePortsData } from '@flowgram.ai/free-layout-editor';
import { ConditionRow, ConditionRowValueType } from '@flowgram.ai/form-materials';
import { Button, Input, Radio } from '@douyinfe/semi-ui';
import { IconCrossCircleStroked, IconPlus } from '@douyinfe/semi-icons';

import { ConditionPort } from '../condition-inputs/styles';
import { generateValidId } from '../../utils';
import { useNodeRenderContext } from '../../../hooks';
import { Feedback, FormItem } from '../../../form-components';
import { BranchContainer, BranchContent, BranchHeader, BranchPort, BranchTitle } from './styles';

interface ConditionValue {
  key: string;
  value?: ConditionRowValueType;
}

interface BranchValue {
  id: string;
  title: string;
  logic: 'and' | 'or';
  conditions: ConditionValue[];
}

export function BranchInputs() {
  const { node, readonly } = useNodeRenderContext();
  const [editingBranchIndex, setEditingBranchIndex] = useState<number | null>(null);

  useLayoutEffect(() => {
    window.requestAnimationFrame(() => {
      node.getData<WorkflowNodePortsData>(WorkflowNodePortsData).updateDynamicPorts();
    });
  }, [node]);

  return (
    <FieldArray name="branches">
      {({ field: branchesField }) => (
        <>
          {branchesField.map((branchField, branchIndex) => (
            <Fragment key={branchField.name}>
              <Field<BranchValue> name={branchField.name}>
                {({ field: branch }) => (
                  <BranchContainer>
                    <BranchHeader>
                      <BranchTitle>
                        {editingBranchIndex === branchIndex ? (
                          <Input
                            value={branch.value.title}
                            onChange={(value) => {
                              branch.onChange({
                                ...branch.value,
                                title: value,
                              });
                            }}
                            onBlur={() => setEditingBranchIndex(null)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                setEditingBranchIndex(null);
                              }
                            }}
                            autoFocus
                          />
                        ) : (
                          <div
                            onDoubleClick={() => !readonly && setEditingBranchIndex(branchIndex)}
                          >
                            {branch.value.title || `Branch ${branchIndex + 1}`} ({branch.value.id})
                          </div>
                        )}
                      </BranchTitle>
                      <FieldArray name={`${branchField.name}.conditions`}>
                        {({ field: conditionsField }) => (
                          <>
                            {conditionsField.value.length > 1 && (
                              <Radio.Group
                                value={branch.value.logic}
                                onChange={(e) => {
                                  branch.onChange({
                                    ...branch.value,
                                    logic: e.target.value,
                                  });
                                }}
                                disabled={readonly}
                              >
                                <Radio value="and">AND</Radio>
                                <Radio value="or">OR</Radio>
                              </Radio.Group>
                            )}
                          </>
                        )}
                      </FieldArray>
                      {!readonly && branchesField.value.length > 1 && (
                        <Button
                          theme="borderless"
                          disabled={readonly}
                          icon={<IconCrossCircleStroked />}
                          onClick={() => branchesField.delete(branchIndex)}
                        />
                      )}
                    </BranchHeader>
                    <BranchContent>
                      <FieldArray name={`${branchField.name}.conditions`}>
                        {({ field: conditionsField }) => (
                          <>
                            {conditionsField.map((conditionField, conditionIndex) => (
                              <Field<ConditionValue>
                                key={conditionField.name}
                                name={conditionField.name}
                              >
                                {({ field: condition, fieldState: conditionState }) => (
                                  <FormItem
                                    name="if"
                                    type="boolean"
                                    required={true}
                                    labelWidth={40}
                                  >
                                    <div
                                      style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                      }}
                                    >
                                      <ConditionRow
                                        readonly={readonly}
                                        style={{ flexGrow: 1 }}
                                        value={condition.value.value}
                                        onChange={(v) =>
                                          condition.onChange({
                                            value: v,
                                            key: condition.value.key,
                                          })
                                        }
                                      />

                                      {!readonly && conditionsField.value.length > 1 && (
                                        <Button
                                          theme="borderless"
                                          disabled={readonly}
                                          icon={<IconCrossCircleStroked />}
                                          onClick={() => conditionsField.delete(conditionIndex)}
                                        />
                                      )}
                                    </div>

                                    <Feedback
                                      errors={conditionState?.errors}
                                      invalid={conditionState?.invalid}
                                    />
                                  </FormItem>
                                )}
                              </Field>
                            ))}
                            {!readonly && (
                              <div>
                                <Button
                                  theme="borderless"
                                  icon={<IconPlus />}
                                  onClick={() =>
                                    conditionsField.append({
                                      key: generateValidId('if', 6),
                                      value: { type: 'expression', content: '' },
                                    })
                                  }
                                >
                                  {I18n.t('Add Condition')}
                                </Button>
                              </div>
                            )}
                          </>
                        )}
                      </FieldArray>
                    </BranchContent>
                    <BranchPort data-port-id={branch.value.id} data-port-type="output" />
                  </BranchContainer>
                )}
              </Field>
            </Fragment>
          ))}
          {!readonly && (
            <div>
              <Button
                theme="borderless"
                icon={<IconPlus />}
                onClick={() =>
                  branchesField.append({
                    id: generateValidId('branch', 5),
                    title: `Branch ${branchesField.value.length + 1}`,
                    logic: 'and',
                    conditions: [
                      {
                        key: generateValidId('if', 6),
                        value: { type: 'expression', content: '' },
                      },
                    ],
                  })
                }
              >
                {I18n.t('Add Branch')}
              </Button>
            </div>
          )}
          <BranchContainer>
            <BranchHeader>ELSE</BranchHeader>
            <ConditionPort data-port-id="else" data-port-type="output" />
          </BranchContainer>
        </>
      )}
    </FieldArray>
  );
}
