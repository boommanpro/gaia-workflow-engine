/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import React from 'react';

import { Field } from '@flowgram.ai/free-layout-editor';
import { createDisableDeclarationPlugin } from '@flowgram.ai/form-materials';

import { FreeFormMetaStoryBuilder, FormHeader } from '../../free-form-meta-story-builder';

const VariableSelector = React.lazy(() =>
  import('@flowgram.ai/form-materials').then((module) => ({
    default: module.VariableSelector,
  }))
);

export const BasicStory = () => (
  <FreeFormMetaStoryBuilder
    filterEndNode
    plugins={() => [createDisableDeclarationPlugin()]}
    formMeta={{
      render: () => (
        <>
          <FormHeader />
          <Field<string[] | undefined> name="variable_selector">
            {({ field }) => (
              <VariableSelector value={field.value} onChange={(value) => field.onChange(value)} />
            )}
          </Field>
        </>
      ),
    }}
  />
);
