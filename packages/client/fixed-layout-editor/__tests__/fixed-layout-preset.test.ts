/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { FlowDocument, FlowNodeFormData } from '@flowgram.ai/editor';

import { baseWithDataMock, baseWithDataMock2, formMock, formMock2 } from '../__mocks__/flow.mock';
import { createContainer } from './create-container';

describe('fixed-layout-preset', () => {
  let flowDocument: FlowDocument;
  beforeEach(() => {
    const container = createContainer({});
    flowDocument = container.get(FlowDocument);
  });
  it('fromJSON and toJSON', () => {
    flowDocument.fromJSON(baseWithDataMock);
    expect(flowDocument.toJSON()).toEqual(baseWithDataMock);
    // reload data
    flowDocument.fromJSON(baseWithDataMock2);
    expect(flowDocument.toJSON()).toEqual(baseWithDataMock2);
  });
  it('custom fromNodeJSON and toNodeJSON', () => {
    const container = createContainer({
      fromNodeJSON: (node, json, isFirstCreate) => {
        if (!json.data) {
          json.data = {};
        }
        json.data = { ...json.data, isFirstCreate };
        return json;
      },
      toNodeJSON(node, json) {
        json.data.runningTimes = (json.data.runningTimes || 0) + 1;
        return json;
      },
    });
    container.get(FlowDocument).fromJSON(baseWithDataMock);
    expect(container.get(FlowDocument).toJSON()).toMatchSnapshot();
    container.get(FlowDocument).fromJSON(baseWithDataMock2);
    expect(container.get(FlowDocument).toJSON()).toMatchSnapshot();
  });
  it('nodeEngine(v2) toJSON', async () => {
    const container = createContainer({
      nodeEngine: {},
      nodeRegistries: [
        {
          type: 'noop',
          formMeta: {
            render: () => undefined,
          },
        },
      ],
    });
    flowDocument = container.get(FlowDocument);
    flowDocument.fromJSON(formMock);
    expect(flowDocument.toJSON()).toEqual(formMock);
    const { formModel } = flowDocument.getNode('noop_0').getData(FlowNodeFormData);
    expect(formModel.getFormItemByPath('title').value).toEqual('noop title');
    formModel.getFormItemByPath('title').value = 'noop title2';
    expect(flowDocument.toJSON()).toMatchSnapshot();
    flowDocument.fromJSON(formMock2);
    expect(flowDocument.toJSON()).toEqual(formMock2);
  });
});
