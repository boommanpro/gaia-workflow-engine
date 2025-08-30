/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import {FormMeta, FormRenderProps, ValidateTrigger} from '@flowgram.ai/free-layout-editor';
import {autoRenameRefEffect} from '@flowgram.ai/form-materials';

import {FlowNodeJSON} from '../../typings';
import {FormContent, FormHeader} from '../../form-components';
import {BranchInputs} from './branch-inputs';

export const renderForm = ({ form }: FormRenderProps<FlowNodeJSON>) => (
  <>
    <FormHeader />
    <FormContent>
      <BranchInputs />
    </FormContent>
  </>
);

export const formMeta: FormMeta<FlowNodeJSON> = {
  render: renderForm,
  validateTrigger: ValidateTrigger.onChange,
  validate: {
    title: ({ value }: { value: string }) => (value ? undefined : 'Title is required'),
    'branches.*.conditions.*': ({ value }) => {
      if (!value?.value) return 'Condition is required';
      return undefined;
    },
  },
  effect: {
    'branches.*.conditions': autoRenameRefEffect,
  },
};
