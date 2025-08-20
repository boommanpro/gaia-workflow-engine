/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { describe, it, expect } from 'vitest';
import { WorkflowDocument } from '@flowgram.ai/free-layout-core';
import { HistoryService } from '@flowgram.ai/free-history-plugin';
import { getNodeForm } from '@flowgram.ai/editor';

import { mockJSON } from '../__mocks__/flow.mocks';
import { createEditor } from './create-editor';

describe('free-layout history', () => {
  it('line-data-change', async () => {
    const editor = createEditor({
      history: {
        enable: true,
      },
    });
    const document = editor.get(WorkflowDocument);
    const history = editor.get(HistoryService);
    let historyEvent: any;
    history.onApply((e) => {
      historyEvent = e;
    });
    document.fromJSON(mockJSON);
    const line = document.linesManager.getLine({
      from: 'start_0',
      to: 'condition_0',
    });
    line.lineData = { a: 33 };
    expect(historyEvent.type).toEqual('changeLineData');
    expect(historyEvent.value).toEqual({
      id: 'start_0_-condition_0_',
      oldValue: undefined,
      newValue: { a: 33 },
    });
    await history.undo();
    expect(historyEvent.value).toEqual({
      id: 'start_0_-condition_0_',
      oldValue: { a: 33 },
      newValue: undefined,
    });
    expect(line.lineData).toEqual(undefined);
    await history.redo();
    expect(historyEvent.value).toEqual({
      id: 'start_0_-condition_0_',
      oldValue: undefined,
      newValue: { a: 33 },
    });
    expect(line.lineData).toEqual({ a: 33 });
    // change moreTimes
    line.lineData = { a: 44 };
    line.lineData = { a: 55 };
    line.lineData = { a: 66 };
    await history.undo();
    expect(line.lineData).toEqual(undefined);
    await history.redo();
    expect(line.lineData).toEqual({ a: 66 });
  });
  it('enableChangeLineData to false', () => {
    const editor = createEditor({
      history: {
        enable: true,
        enableChangeLineData: false,
      },
    });
    const document = editor.get(WorkflowDocument);
    document.fromJSON(mockJSON);
    const history = editor.get(HistoryService);
    let historyEvent: any;
    history.onApply((e) => {
      historyEvent = e;
    });
    const line = document.linesManager.getLine({
      from: 'start_0',
      to: 'condition_0',
    });
    line.lineData = { a: 33 };
    expect(historyEvent).toEqual(undefined);
  });
  it('changeNodeForm', async () => {
    const editor = createEditor({
      history: {
        enable: true,
      },
      nodeEngine: {
        enable: true,
      },
      getNodeDefaultRegistry: (type) => ({
        type,
        formMeta: {
          render: () => null,
        },
      }),
    });
    let historyEvent: any;
    const history = editor.get(HistoryService);
    history.onApply((e) => {
      historyEvent = e;
    });
    const flowDocument = editor.get(WorkflowDocument);
    flowDocument.fromJSON(mockJSON);
    const node = flowDocument.getNode('start_0');
    const form = getNodeForm(node);
    form.setValueIn('title', 'title changed');
    expect(historyEvent).toEqual({
      type: 'changeFormValues',
      value: {
        id: 'start_0',
        path: 'title',
        value: 'title changed',
        oldValue: 'Start',
      },
    });
    await history.undo();
    expect(form.getValueIn('title')).toEqual('Start');
    await history.redo();
    expect(form.getValueIn('title')).toEqual('title changed');
  });
});
