/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import React from 'react';

import { Field } from '@flowgram.ai/free-layout-editor';
import {
  ConditionRow,
  ConditionRowValueType,
  createTypePresetPlugin,
  DynamicValueInput,
  IFlowConstantRefValue,
  type IJsonSchema,
} from '@flowgram.ai/form-materials';
import { ColorPicker } from '@douyinfe/semi-ui';
import { IconColorPalette } from '@douyinfe/semi-icons';

import { FreeFormMetaStoryBuilder, FormHeader } from '../../free-form-meta-story-builder';

import './json-schema-preset.css';

const TypeSelector = React.lazy(() =>
  import('@flowgram.ai/form-materials').then((module) => ({
    default: module.TypeSelector,
  }))
);

export const BasicStory = () => (
  <FreeFormMetaStoryBuilder
    filterEndNode
    transformInitialNode={{
      start_0: (node) => {
        node.data.outputs = {
          type: 'object',
          properties: {
            color_output: {
              type: 'color',
            },
          },
        };
        return node;
      },
    }}
    plugins={() => [
      createTypePresetPlugin({
        types: [
          {
            type: 'color',
            icon: <IconColorPalette />,
            label: 'Color',
            ConstantRenderer: ({ value, onChange }) => (
              <div className="json-schema-color-picker-container ">
                <ColorPicker
                  alpha={true}
                  usePopover={true}
                  value={value ? ColorPicker.colorStringToValue(value) : undefined}
                  onChange={(_value) => onChange?.(_value.hex)}
                />
              </div>
            ),
            conditionRule: {
              eq: { type: 'color' },
            },
          },
        ],
      }),
    ]}
    formMeta={{
      render: () => (
        <>
          <FormHeader />
          <b>Type Selector: </b>
          <Field<Partial<IJsonSchema> | undefined>
            name="type_selector"
            defaultValue={{ type: 'color' }}
          >
            {({ field }) => (
              <TypeSelector value={field.value} onChange={(value) => field.onChange(value)} />
            )}
          </Field>
          <br />

          <b>DynamicValueInput: </b>
          <Field<IFlowConstantRefValue | undefined>
            name="dynamic_value_input"
            defaultValue={{ type: 'constant', schema: { type: 'color' }, content: '#b5ed0c' }}
          >
            {({ field }) => (
              <DynamicValueInput value={field.value} onChange={(value) => field.onChange(value)} />
            )}
          </Field>
          <br />

          <b>Condition: </b>
          <Field<ConditionRowValueType | undefined>
            name="condition_row"
            defaultValue={{
              left: { type: 'ref', content: ['start_0', 'color_output'] },
              operator: 'eq',
              right: { type: 'ref', content: ['start_0', 'color_output'] },
            }}
          >
            {({ field }) => (
              <ConditionRow value={field.value} onChange={(value) => field.onChange(value)} />
            )}
          </Field>
          <br />
        </>
      ),
    }}
  />
);
