/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { Meta, StoryObj } from 'storybook-react-rsbuild';
import { Field, FormMeta } from '@flowgram.ai/free-layout-editor';
import { BlurInput } from '@flowgram.ai/form-materials';

import { FreeFormMetaStoryBuilder } from '../../components/free-form-meta-story-builder';
import { FormHeader } from '../../components/form-header';

const Story = (args: { formMeta: FormMeta }) => (
  <FreeFormMetaStoryBuilder formMeta={args.formMeta} />
);

const meta: Meta<typeof Story> = {
  title: 'Form Components/BlurInput',
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
          <Field<string> name="input" defaultValue="Initial text">
            {({ field }) => (
              <BlurInput
                value={field.value}
                onChange={(value) => field.onChange(value)}
                placeholder="Please enter text"
              />
            )}
          </Field>
        </>
      ),
    },
  },
};

export const WithPlaceholder: Story = {
  args: {
    formMeta: {
      render: () => (
        <>
          <FormHeader />
          <Field<string> name="inputWithPlaceholder" defaultValue="">
            {({ field }) => (
              <BlurInput
                value={field.value}
                onChange={(value) => field.onChange(value)}
                placeholder="This is an input field with placeholder"
              />
            )}
          </Field>
        </>
      ),
    },
  },
};

export const Disabled: Story = {
  args: {
    formMeta: {
      render: () => (
        <>
          <FormHeader />
          <Field<string> name="disabledInput" defaultValue="Disabled state text">
            {({ field }) => (
              <BlurInput value={field.value} onChange={(value) => field.onChange(value)} disabled />
            )}
          </Field>
        </>
      ),
    },
  },
};

export default meta;
