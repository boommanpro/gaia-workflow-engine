/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { Meta, StoryObj } from 'storybook-react-rsbuild';
import { Field, FormMeta } from '@flowgram.ai/free-layout-editor';
import { IInputsValues, InputsValuesTree } from '@flowgram.ai/form-materials';

import { FreeFormMetaStoryBuilder } from '../../components/free-form-meta-story-builder';
import { FormHeader } from '../../components/form-header';

const Story = (args: { formMeta: FormMeta }) => (
  <FreeFormMetaStoryBuilder formMeta={args.formMeta} />
);

const meta: Meta<typeof Story> = {
  title: 'Form Components/InputsValuesTree',
  component: Story,
  tags: ['autodocs'],
};

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    formMeta: {
      render: () => (
        <>
          <FormHeader />
          <Field<IInputsValues | undefined> name="inputsValues">
            {({ field }) => (
              <InputsValuesTree value={field.value} onChange={(value) => field.onChange(value)} />
            )}
          </Field>
        </>
      ),
    },
  },
};

export const WithDefaultValue: Story = {
  args: {
    formMeta: {
      render: () => (
        <>
          <FormHeader />
          <Field<IInputsValues | undefined>
            name="inputsValues"
            defaultValue={{
              a: {
                b: { type: 'constant', content: '123', schema: { type: 'string' } },
                c: { type: 'constant', content: 456, schema: { type: 'number' } },
              },
              d: {
                type: 'constant',
                content: `{"hello": "world"}`,
                schema: { type: 'object' },
              },
            }}
          >
            {({ field }) => (
              <InputsValuesTree value={field.value} onChange={(value) => field.onChange(value)} />
            )}
          </Field>
        </>
      ),
    },
  },
};

export default meta;
