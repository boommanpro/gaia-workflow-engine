/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import React from 'react';

import { describe, it, expect } from 'vitest';
import { WorkflowDocument } from '@flowgram.ai/free-layout-core';
import { FlowDocument, FlowNodeFormData } from '@flowgram.ai/editor';

import { WorkflowOperationService } from '../src/types';
import { mockJSON, mockJSON2, mockSimpleJSON, mockSimpleJSON2 } from '../__mocks__/flow.mocks';
import { createEditor } from './create-editor';

describe('free-layout-preset', () => {
  it('fromJSON and toJSON', () => {
    const editor = createEditor({});
    const document = editor.get(WorkflowDocument);
    document.fromJSON(mockJSON);
    expect(document.toJSON()).toEqual(mockJSON);
    document.fromJSON(mockJSON2);
    expect(document.toJSON()).toEqual(mockJSON2);
  });
  it('operation fromJSON', () => {
    const editor = createEditor({
      history: {
        enable: true,
      },
    });
    const operation = editor.get<WorkflowOperationService>(WorkflowOperationService);
    const document = editor.get(WorkflowDocument);
    operation.fromJSON(mockJSON);
    expect(document.toJSON()).toEqual(mockJSON);
    document.clear();
    operation.fromJSON(mockJSON2);
    expect(document.toJSON()).toEqual(mockJSON2);
  });
  it('custom fromNodeJSON and toNodeJSON', () => {
    const container = createEditor({
      fromNodeJSON: (node, json, isFirstCreate) => {
        if (!json.data) {
          json.data = {};
        }
        json.data = { ...json.data, isFirstCreate };
        return json;
      },
      toNodeJSON(node, json) {
        json.data!.runningTimes = (json.data!.runningTimes || 0) + 1;
        return json;
      },
    });
    container.get(FlowDocument).fromJSON(mockSimpleJSON);
    expect(container.get(FlowDocument).toJSON()).toMatchSnapshot();
    container.get(FlowDocument).fromJSON(mockSimpleJSON2);
    expect(container.get(FlowDocument).toJSON()).toMatchSnapshot();
  });
  it('nodeEngine(v2) toJSON', async () => {
    const container = createEditor({
      nodeEngine: {},
      nodeRegistries: [
        {
          type: 'start',
          formMeta: {
            render: () => React.createElement('div', { className: 'start-node' }),
          },
        },
        {
          type: 'end',
          formMeta: {
            render: () => React.createElement('div', { className: 'end-node' }),
          },
        },
      ],
    });
    const flowDocument = container.get(FlowDocument);
    flowDocument.fromJSON(mockSimpleJSON);
    expect(flowDocument.toJSON()).toEqual(mockSimpleJSON);
    flowDocument.fromJSON(mockSimpleJSON2);
    expect(flowDocument.toJSON()).toEqual(mockSimpleJSON2);
    const { formModel } = flowDocument.getNode('start_0')!.getData(FlowNodeFormData);
    expect(formModel.getFormItemByPath('title')!.value).toEqual('start changed');
    formModel.getFormItemByPath('title')!.value = 'start changed 2';
    expect(formModel.toJSON()).toEqual({
      title: 'start changed 2',
    });
  });
});
