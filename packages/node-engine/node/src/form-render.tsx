/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import React from 'react';

import { Form } from '@flowgram.ai/form';

import { FormModelV2 } from './form-model-v2';

interface FormRenderProps {
  formModel: FormModelV2;
}

const FormRender = ({ formModel }: FormRenderProps) =>
  formModel?.formControl ? (
    <>
      <Form control={formModel?.formControl} keepModelOnUnMount>
        {formModel.formMeta.render}
      </Form>
    </>
  ) : null;

export function renderForm(formModel: FormModelV2) {
  return <FormRender formModel={formModel} />;
}
