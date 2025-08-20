/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import {
  Field,
  FieldRenderProps,
  FormMeta,
  ValidateTrigger,
} from '@flowgram.ai/free-layout-editor';
import { Input } from '@douyinfe/semi-ui';

// FieldWrapper is not provided by sdk, and can be customized
import { FieldWrapper } from './components';

const render = () => (
  <div className="demo-node-content">
    <div className="demo-node-title">Basic Node</div>
    <Field name="name">
      {({ field, fieldState }: FieldRenderProps<string>) => (
        <FieldWrapper required title="Name" error={fieldState.errors?.[0]?.message}>
          <Input size={'small'} {...field} />
        </FieldWrapper>
      )}
    </Field>

    <Field name="city">
      {({ field, fieldState }: FieldRenderProps<string>) => (
        <FieldWrapper required title="City" error={fieldState.errors?.[0]?.message}>
          <Input size={'small'} {...field} />
        </FieldWrapper>
      )}
    </Field>
  </div>
);

const formMeta: FormMeta = {
  render,
  defaultValues: { name: 'Tina', city: 'Hangzhou' },
  validateTrigger: ValidateTrigger.onChange,
  validate: {
    name: ({ value }) => {
      if (!value) {
        return 'Name is required';
      }
    },
    city: ({ value }) => {
      if (!value) {
        return 'City is required';
      }
    },
  },
};

export const DEFAULT_FORM_META = formMeta;
