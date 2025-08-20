/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { FormRenderProps, FormMeta, Field } from '@flowgram.ai/fixed-layout-editor';

import { FlowNodeJSON } from '../../typings';
import { useNodeRenderContext } from '../../hooks';

export const renderForm = (props: FormRenderProps<FlowNodeJSON['data']>) => {
  const { node } = useNodeRenderContext();
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        backgroundColor: node.index === 0 ? 'green' : 'red',
        color: 'white',
        display: 'flex',
        pointerEvents: 'none',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Field name="title">{({ field }) => <>{field.value}</>}</Field>
    </div>
  );
};

export const formMeta: FormMeta<FlowNodeJSON['data']> = {
  render: renderForm,
};
