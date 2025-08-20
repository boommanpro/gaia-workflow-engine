/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import {
  DataEvent,
  EffectFuncProps,
  Field,
  FieldRenderProps,
  FormMeta,
  ValidateTrigger,
  WorkflowNodeRegistry,
  FieldArray,
  FieldArrayRenderProps,
} from '@flowgram.ai/free-layout-editor';
import { FieldWrapper } from '@flowgram.ai/demo-node-form';
import { Input, Button, Popover } from '@douyinfe/semi-ui';
import { IconPlus, IconCrossCircleStroked, IconArrowDown } from '@douyinfe/semi-icons';
import './index.css';
import '../index.css';

export const render = () => (
  <div className="demo-node-content">
    <div className="demo-node-title">Array Examples</div>
    <FieldArray name="array">
      {({ field, fieldState }: FieldArrayRenderProps<string>) => (
        <FieldWrapper title={'My Array'}>
          {field.map((child, index) => (
            <Field name={child.name} key={child.key}>
              {({ field: childField, fieldState: childState }: FieldRenderProps<string>) => (
                <FieldWrapper error={childState.errors?.[0]?.message}>
                  <div className="array-item-wrapper">
                    <Input {...childField} size={'small'} />
                    {index < field.value!.length - 1 ? (
                      <Popover
                        content={'swap with next element'}
                        className={'icon-button-popover'}
                        showArrow
                        position={'topLeft'}
                      >
                        <Button
                          theme="borderless"
                          size={'small'}
                          icon={<IconArrowDown />}
                          onClick={() => field.swap(index, index + 1)}
                        />
                      </Popover>
                    ) : null}
                    <Popover
                      content={'delete current element'}
                      className={'icon-button-popover'}
                      showArrow
                      position={'topLeft'}
                    >
                      <Button
                        theme="borderless"
                        size={'small'}
                        icon={<IconCrossCircleStroked />}
                        onClick={() => field.delete(index)}
                      />
                    </Popover>
                  </div>
                </FieldWrapper>
              )}
            </Field>
          ))}
          <div>
            <Button
              size={'small'}
              theme="borderless"
              icon={<IconPlus />}
              onClick={() => field.append('default')}
            >
              Add
            </Button>
          </div>
        </FieldWrapper>
      )}
    </FieldArray>
  </div>
);

interface FormData {
  array: string[];
}

const formMeta: FormMeta<FormData> = {
  render,
  validateTrigger: ValidateTrigger.onChange,
  defaultValues: {
    array: ['default'],
  },
  validate: {
    'array.*': ({ value }) =>
      value.length > 8 ? 'max length exceeded: current length is ' + value.length : undefined,
  },
  effect: {
    'array.*': [
      {
        event: DataEvent.onValueInit,
        effect: ({ value, name }: EffectFuncProps<string, FormData>) => {
          console.log(name + ' value init to ', value);
        },
      },
      {
        event: DataEvent.onValueChange,
        effect: ({ value, name }: EffectFuncProps<string, FormData>) => {
          console.log(name + ' value changed to ', value);
        },
      },
    ],
  },
};

export const nodeRegistry: WorkflowNodeRegistry = {
  type: 'custom',
  meta: {},
  defaultPorts: [{ type: 'output' }, { type: 'input' }],
  formMeta,
};
