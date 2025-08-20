/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import {
  DEFAULT_DEMO_REGISTRY,
  DEFAULT_INITIAL_DATA,
  defaultInitialDataTs,
  fieldWrapperCss,
  fieldWrapperTs,
} from '@flowgram.ai/demo-node-form';

import { PreviewEditor } from '../preview-editor';
import { Editor } from './editor';

const registryCode = {
  code: `import {
  Field,
  FieldRenderProps,
  FormMeta,
  ValidateTrigger,
} from '@flowgram.ai/free-layout-editor';
import { Input } from '@douyinfe/semi-ui';

// FieldWrapper is not provided by sdk, it can be customized
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
    }
  }
};



export const nodeRegistry: WorkflowNodeRegistry = {
  type: 'custom',
  meta: {},
  defaultPorts: [{ type: 'output' }, { type: 'input' }],
  formMeta
};
`,
  active: true,
};

export const NodeFormBasicPreview = () => {
  const files = {
    'node-registry.tsx': registryCode,
    'initial-data.ts': { code: defaultInitialDataTs, active: true },
    'field-wrapper.tsx': { code: fieldWrapperTs, active: true },
    'field-wrapper.css': { code: fieldWrapperCss, active: true },
  };
  return (
    <PreviewEditor files={files} previewStyle={{ height: 500 }} editorStyle={{ height: 500 }}>
      <Editor registry={DEFAULT_DEMO_REGISTRY} initialData={DEFAULT_INITIAL_DATA} />
    </PreviewEditor>
  );
};
