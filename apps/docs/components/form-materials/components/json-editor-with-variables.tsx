/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import React from 'react';

import { Field } from '@flowgram.ai/fixed-layout-editor';

import { FreeFormMetaStoryBuilder, FormHeader } from '../../free-form-meta-story-builder';

const JsonEditorWithVariables = React.lazy(() =>
  import('@flowgram.ai/form-materials').then((module) => ({
    default: module.JsonEditorWithVariables,
  }))
);

export const BasicStory = () => (
  <FreeFormMetaStoryBuilder
    filterEndNode
    formMeta={{
      render: () => (
        <>
          <FormHeader />
          <Field<any> name="json_editor_with_variables" defaultValue={`{ "a": {{start_0.str}}}`}>
            {({ field }) => (
              <JsonEditorWithVariables
                value={field.value}
                onChange={(value) => field.onChange(value)}
              />
            )}
          </Field>
        </>
      ),
    }}
  />
);
