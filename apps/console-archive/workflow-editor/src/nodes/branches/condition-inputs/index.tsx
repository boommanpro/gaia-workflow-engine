/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { Fragment, useLayoutEffect } from 'react';

import { Field, FieldArray, I18n, WorkflowNodePortsData } from '@flowgram.ai/free-layout-editor';
import { ConditionRow, ConditionRowValueType } from '@flowgram.ai/form-materials';
import { Button } from '@douyinfe/semi-ui';
import { IconCrossCircleStroked, IconPlus } from '@douyinfe/semi-icons';

import { generateValidId } from '../../utils';
import { useNodeRenderContext, useIsSidebar } from '../../../hooks';
import { Feedback, FormItem } from '../../../form-components';
import { ConditionPort } from './styles';

interface ConditionValue {
  key: string;
  value?: ConditionRowValueType;
}

export function ConditionInputs() {
  const { node, readonly } = useNodeRenderContext();
  const isSidebar = useIsSidebar();

  useLayoutEffect(() => {
    window.requestAnimationFrame(() => {
      node.getData<WorkflowNodePortsData>(WorkflowNodePortsData).updateDynamicPorts();
    });
  }, [node]);

  return (
    <FieldArray name="conditions">
      {({ field }) => (
        <>
          {field.map((child, index) => (
            <Fragment key={child.name}>
              <Field<ConditionValue> name={child.name}>
                {({ field: childField, fieldState: childState }) => (
                  <FormItem name="if" type="boolean" required={true} labelWidth={40}>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <ConditionRow
                        readonly={readonly}
                        style={{ flexGrow: 1 }}
                        value={childField.value.value}
                        onChange={(v) =>
                          childField.onChange({ value: v, key: childField.value.key })
                        }
                      />

                      {!readonly && (
                        <Button
                          theme="borderless"
                          disabled={readonly}
                          icon={<IconCrossCircleStroked />}
                          onClick={() => field.delete(index)}
                        />
                      )}
                    </div>

                    <Feedback errors={childState?.errors} invalid={childState?.invalid} />
                    <ConditionPort data-port-id={childField.value.key} data-port-type="output" />
                  </FormItem>
                )}
              </Field>
            </Fragment>
          ))}
          {isSidebar && (
            <div>
              <Button
                theme="borderless"
                icon={<IconPlus />}
                onClick={() =>
                  field.append({
                    key: generateValidId('if', 6),
                    value: { type: 'expression', content: '' },
                  })
                }
              >
                {I18n.t('Add')}
              </Button>
            </div>
          )}
        </>
      )}
    </FieldArray>
  );
}
