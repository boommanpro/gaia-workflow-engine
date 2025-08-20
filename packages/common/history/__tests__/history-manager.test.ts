/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Container, interfaces } from 'inversify';

import { HistoryManager } from '../src/history/history-manager';
import { HistoryContainerModule, HistoryService, HistoryStack } from '../src';
import { createHistoryContainer } from '../__mocks__/history-container.mock';
import { Editor } from '../__mocks__/editor.mock';

function getStackSnapshot(historyStack: HistoryStack) {
  return historyStack.items.map((item) => ({
    operations: item.operations.map((op) => ({
      type: op.type,
      value: op.value,
      uri: op.uri?.toString(),
    })),
    type: item.type,
    uri: item.uri?.toString(),
  }));
}

describe('history-manager', () => {
  let ide_container: interfaces.Container;
  let containers: interfaces.Container[];
  let editor1: Editor;
  let historyService1: HistoryService;
  let editor2: Editor;
  let historyService2: HistoryService;
  let historyManager: HistoryManager;

  beforeEach(() => {
    ide_container = new Container();
    (ide_container as any).name = 'ide_container';
    ide_container.load(HistoryContainerModule);
    const container1 = createHistoryContainer('container1', ide_container);
    const container2 = createHistoryContainer('container2', ide_container);
    containers = [container1, container2];
    editor1 = container1.get(Editor);
    editor2 = container2.get(Editor);
    historyService1 = container1.get(HistoryService);
    historyService1.context.uri = 'file:///editor1';
    historyService2 = container2.get(HistoryService);
    historyService2.context.uri = 'file:///editor2';
    historyManager = ide_container.get(HistoryManager);
  });

  it('different container instances should not be the same', () => {
    expect(editor1 === editor2).toBeFalsy();
    expect(historyService1 === historyService2).toBeFalsy();
  });

  it('different editor operations should not be the same', () => {
    editor1.handleInsertText({ index: 0, text: 'test' });
    expect(editor1.canUndo()).toBeTruthy();
    expect(editor2.canUndo()).toBeFalsy();
  });

  it('different editor operations should all be captured in history manager', async () => {
    const fn = vi.fn();
    historyManager.historyStack.onChange(fn);
    editor1.handleInsertText({ index: 0, text: 'test' });
    editor2.handleInsertText({ index: 0, text: 'test' });

    await editor1.undo();
    await editor2.undo();
    await editor1.redo();
    await editor2.redo();
    expect(historyManager.historyStack.items).toHaveLength(6);
    expect(fn).toBeCalledTimes(6);
  });

  it('dispose', () => {
    historyService1.dispose();
    expect((historyManager as any)._historyServices).toHaveLength(1);
    historyManager.dispose();
    expect(historyManager.historyStack.items).toHaveLength(0);
    expect((historyManager as any).historyStack._toDispose.disposed).toBeTruthy();
  });

  it('unrRegisterHistoryService', () => {
    historyManager.unregisterHistoryService(historyService1);
    const services = Array.from((historyManager as any)._historyServices.keys());
    expect(services).toHaveLength(1);
    expect(services[0]).toEqual(historyService2);
  });

  it('limit', async () => {
    historyManager.historyStack.limit = 2;
    editor1.handleInsertText({ index: 0, text: 'test' });
    editor2.handleInsertText({ index: 0, text: 'test' });

    await editor1.undo();
    await editor2.undo();
    await editor2.redo();
    expect(historyManager.historyStack.items.map((s) => s.type)).toEqual(['redo', 'undo']);
  });

  it('merge operation should update history stack', () => {
    editor1.testTransact();
    editor2.testTransact();
    expect(getStackSnapshot(historyManager.historyStack)).toMatchSnapshot();
  });

  it('clear should not be recorded', async () => {
    editor1.handleInsertText({ index: 0, text: 'test' });
    await editor1.undo();
    historyService1.clear();
    expect(historyManager.historyStack.items).toHaveLength(2);
  });
});
