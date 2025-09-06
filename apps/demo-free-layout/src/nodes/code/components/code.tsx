/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { Field } from '@flowgram.ai/free-layout-editor';
import { CodeEditor } from '@flowgram.ai/form-materials';
import { Divider, Select } from '@douyinfe/semi-ui';

import { useIsSidebar, useNodeRenderContext } from '../../../hooks';
import { FormItem } from '../../../form-components';

export function Code() {
  const isSidebar = useIsSidebar();
  const { readonly } = useNodeRenderContext();

  if (!isSidebar) {
    return null;
  }

  const languageOptions = [
    { label: 'JavaScript (Return)', value: 'jsReturn' },
    { label: 'Java', value: 'java' },
    { label: 'Groovy', value: 'groovy' },
  ];

  const getLanguageId = (language: string) => {
    switch (language) {
      case 'java':
        return 'java';
      case 'groovy':
        return 'groovy';
      default:
        return 'javascript';
    }
  };

  return (
    <>
      <Divider />
      <FormItem name="language" type="string">
        <Field<string> name="script.language">
          {({ field }) => (
            <Select
              optionList={languageOptions}
              value={field.value}
              onChange={(value) => field.onChange(value as string)}
              disabled={readonly}
            />
          )}
        </Field>
      </FormItem>
      <Field<string> name="script.content">
        {({ field }) => (
          <CodeEditor
            languageId={getLanguageId(field.value)}
            value={field.value}
            onChange={(value) => field.onChange(value)}
            readonly={readonly}
          />
        )}
      </Field>
    </>
  );
}