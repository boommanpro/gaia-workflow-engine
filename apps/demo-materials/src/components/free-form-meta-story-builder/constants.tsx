/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import {
  Field,
  FieldRenderProps,
  FlowNodeMeta,
  FlowNodeRegistry,
} from '@flowgram.ai/free-layout-editor';
import {
  IJsonSchema,
  InputsValues,
  JsonSchemaEditor,
  provideJsonSchemaOutputs,
} from '@flowgram.ai/form-materials';

import { FormHeader } from '../form-header';
import iconStart from '../../assets/icon-start.jpg';
import iconScript from '../../assets/icon-script.png';
import iconEnd from '../../assets/icon-end.jpg';

export const DEFAULT_FORM_META = {
  render: () => (
    <div>
      <FormHeader />
      <div>TODO</div>
    </div>
  ),
};

export const START_REGISTRY: FlowNodeRegistry<FlowNodeMeta> = {
  type: 'start',
  meta: {
    isStart: true,
    deleteDisable: true,
    copyDisable: true,
    nodePanelVisible: false,
    defaultPorts: [{ type: 'output' }],
    size: {
      width: 360,
      height: 211,
    },
  },
  info: {
    icon: iconStart,
    description: 'You can add variables here to test variable reference',
  },
  canAdd() {
    return false;
  },
  formMeta: {
    render: () => (
      <div>
        <FormHeader />
        <Field
          name="outputs"
          render={({ field: { value, onChange } }: FieldRenderProps<IJsonSchema>) => (
            <>
              <JsonSchemaEditor
                value={value}
                onChange={(value) => onChange(value as IJsonSchema)}
              />
            </>
          )}
        />
      </div>
    ),
    effect: {
      outputs: provideJsonSchemaOutputs,
    },
  },
};

export const END_REGISTRY: FlowNodeRegistry<FlowNodeMeta> = {
  type: 'end',
  meta: {
    isEnd: true,
    deleteDisable: true,
    copyDisable: true,
    nodePanelVisible: false,
    defaultPorts: [{ type: 'input' }],
    size: {
      width: 360,
      height: 211,
    },
  },
  info: {
    icon: iconEnd,
    description: 'You can test variables created in the previous nodes',
  },
  canAdd() {
    return false;
  },
  formMeta: {
    render: () => (
      <div>
        <FormHeader />
        <Field
          name="inputsValues"
          render={({ field: { value, onChange } }: FieldRenderProps<any>) => (
            <>
              <InputsValues value={value} onChange={(value) => onChange(value)} />
            </>
          )}
        />
      </div>
    ),
  },
};

// export const VARIABLE_REGISTRY: FlowNodeRegistry<FlowNodeMeta> = {};

export const CUSTOM_REGISTRY: FlowNodeRegistry<FlowNodeMeta> = {
  type: 'custom',
  meta: {
    deleteDisable: true,
    copyDisable: true,
    nodePanelVisible: false,
    defaultPorts: [{ type: 'input' }, { type: 'output' }],
    size: {
      width: 360,
      height: 211,
    },
  },
  info: {
    icon: iconScript,
    description: 'You can add custom form meta here',
  },
  canAdd() {
    return true;
  },
  formMeta: DEFAULT_FORM_META,
};
