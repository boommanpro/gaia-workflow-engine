/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { Meta, StoryObj } from 'storybook-react-rsbuild';
import { Field, FormMeta } from '@flowgram.ai/free-layout-editor';
import { SQLEditorWithVariables } from '@flowgram.ai/form-materials';

import { FreeFormMetaStoryBuilder } from '../../components/free-form-meta-story-builder';
import { FormHeader } from '../../components/form-header';

const Story = (args: { formMeta: FormMeta }) => (
  <FreeFormMetaStoryBuilder formMeta={args.formMeta} />
);

const meta: Meta<typeof Story> = {
  title: 'Form Components/SqlEditorWithVariables',
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
          <Field<string | undefined>
            name="editor"
            defaultValue="SELECT * FROM users WHERE user_id = {{start_0.str}}"
          >
            {({ field }) => (
              <SQLEditorWithVariables
                value={field.value}
                onChange={(value) => field.onChange(value)}
              />
            )}
          </Field>
        </>
      ),
    },
  },
};

export default meta;
