/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { omit } from 'lodash-es';

import { HistoryService, UndoRedoService } from '../src';
import { createHistoryContainer } from '../__mocks__/history-container.mock';
import { Editor, MOCK_URI, defaultRoot } from '../__mocks__/editor.mock';

describe('history-service', () => {
  let container;
  let editor: Editor;
  let undoRedoService: UndoRedoService;
  let historyService: HistoryService;

  beforeEach(() => {
    container = createHistoryContainer();
    editor = container.get(Editor);
    undoRedoService = container.get(UndoRedoService);
    historyService = container.get(HistoryService);
  });

  it('push insert operation should apply editor insert', () => {
    const node1 = { id: 2, data: 'test2', children: [] };
    editor.handleInsert({ parentId: 1, index: 0, node: node1 });
    expect(editor.node.children[0]).toEqual(node1);
  });

  it('undo insert operation should delete node', async () => {
    const node1 = { id: 2, data: 'test2', children: [] };
    editor.handleInsert({ parentId: 1, index: 0, node: node1 });
    await editor.undo();
    expect(editor.node.children).toEqual([]);
  });

  it('undo operation then push operation should clear redo stack', async () => {
    const node1 = { id: 2, data: 'test2', children: [] };
    editor.handleInsert({ parentId: 1, index: 0, node: node1 });
    await editor.undo();
    editor.handleInsert({ parentId: 1, index: 0, node: node1 });
    expect(editor.canRedo()).toBeFalsy();
  });

  it('push twice undo once should remain the first insert node', async () => {
    const node1 = { id: 2, data: 'test2', children: [] };
    editor.handleInsert({ parentId: 1, index: 0, node: node1 });
    const node2 = { id: 3, data: 'test3', children: [] };
    editor.handleInsert({ parentId: 1, index: 0, node: node2 });
    await editor.undo();
    expect(editor.node.children).toEqual([node1]);
  });

  it('push save disabled operation should push no operation', async () => {
    editor.handleSelection();
    expect(editor.canUndo()).toBeFalsy();
  });

  it('push operation with merge should be merged', async () => {
    editor.handleInsertText({ index: 0, text: 'test' });
    editor.handleInsertText({ index: 4, text: 'aaa' });
    expect(undoRedoService.getUndoStack().length).toEqual(1);
    expect(undoRedoService.getLastElement().getOperations().length).toEqual(2);
    expect(editor.text).toEqual('testaaa');
    await editor.undo();
    expect(editor.text).toEqual('');
  });

  it('push operation with merge operation should be merged', async () => {
    editor.handleDeleteText({ index: 0, text: 'test' });
    editor.handleDeleteText({ index: 4, text: 'aaa' });
    expect(undoRedoService.getUndoStack().length).toEqual(1);
    expect(undoRedoService.getLastElement().getOperations().length).toEqual(1);
    expect(editor.text).toEqual('');
    await editor.undo();
    expect(editor.text).toEqual('');
  });

  it('push no registered operation should throw error', () => {
    expect(() => historyService.pushOperation({ type: 'test', value: {} })).toThrowError(
      'Operation meta test has not registered.'
    );
  });

  it('push operation should return correct history options', async () => {
    const node1 = { id: 2, data: 'test2', children: [] };
    editor.handleInsert({ parentId: 1, index: 0, node: node1 });
    const node2 = { id: 3, data: 'test3', children: [] };
    editor.handleInsert({ parentId: 2, index: 0, node: node2 });
    expect(editor.getHistoryOperations()).toMatchSnapshot();
  });

  it('push undo redo multi times should get correct tree and history options', async () => {
    const node1 = { id: 2, data: 'test2', children: [] };
    editor.handleInsert({ parentId: 1, index: 0, node: node1 });
    const node2 = { id: 3, data: 'test3', children: [] };
    editor.handleInsert({ parentId: 2, index: 0, node: node2 });
    const node3 = { id: 4, data: 'test4', children: [] };
    editor.handleInsert({ parentId: 2, index: 0, node: node3 });
    const node4 = { id: 5, data: 'test5', children: [] };
    editor.handleInsert({ parentId: 2, index: 0, node: node4 });
    await editor.undo();
    await editor.undo();
    await editor.redo();
    await editor.undo();
    await editor.redo();
    expect(editor.node).toMatchSnapshot();
    expect(editor.getHistoryOperations()).toMatchSnapshot();
  });

  it('transact', async () => {
    editor.reset();
    historyService.transact(() => {
      const node1 = { id: 2, data: 'test2', children: [] };
      editor.handleInsert({ parentId: 1, index: 0, node: node1 });
      const node2 = { id: 3, data: 'test3', children: [] };
      editor.handleInsert({ parentId: 2, index: 0, node: node2 });
      const node3 = { id: 4, data: 'test4', children: [] };
      editor.handleInsert({ parentId: 2, index: 0, node: node3 });
      const node4 = { id: 5, data: 'test5', children: [] };
      editor.handleInsert({ parentId: 2, index: 0, node: node4 });

      historyService.transact(() => {
        const node5 = { id: 6, data: 'test6', children: [] };
        editor.handleInsert({ parentId: 2, index: 0, node: node5 });
      });
    });
    await editor.undo();
    expect(editor.node).toEqual(defaultRoot());
    expect(editor.getHistoryOperations()).toMatchSnapshot();
  });

  it('transact no operation', async () => {
    historyService.transact(() => {});
    expect(historyService.canUndo()).toEqual(false);
  });

  it('clear should clear all', () => {
    const node1 = { id: 2, data: 'test2', children: [] };
    editor.handleInsert({ parentId: 1, index: 0, node: node1 });
    expect(historyService.canUndo()).toEqual(true);
    expect(historyService.getHistoryOperations().length).toEqual(1);
    historyService.clear();
    expect(historyService.canUndo()).toEqual(false);
  });

  it('operation should not be recorded when stopped', () => {
    historyService.clear();
    const node1 = { id: 2, data: 'test2', children: [] };
    historyService.stop();
    editor.handleInsert({ parentId: 1, index: 0, node: node1 });
    expect(historyService.canUndo()).toEqual(false);
    historyService.start();
    editor.handleInsert({ parentId: 1, index: 0, node: node1 });
    expect(historyService.canUndo()).toEqual(true);
  });

  it('push operation when limited should not increase the length', () => {
    historyService.limit(2);
    const node1 = { id: 2, data: 'test2', children: [] };
    editor.handleInsert({ parentId: 1, index: 0, node: node1 });
    const node2 = { id: 3, data: 'test3', children: [] };
    editor.handleInsert({ parentId: 2, index: 0, node: node2 });
    const node3 = { id: 4, data: 'test4', children: [] };
    editor.handleInsert({ parentId: 2, index: 0, node: node3 });
    const undoStack = (historyService as any).undoRedoService.getUndoStack();
    expect(undoStack.length).toEqual(2);
    expect(
      undoStack.map((item) => item.getOperations().map((op) => omit(op, 'id')))
    ).toMatchSnapshot();
  });

  it('merge by time', () => {
    editor.handleMultiOperation();
    const undoStack = (historyService as any).undoRedoService.getUndoStack();
    expect(undoStack.length).toEqual(1);
    expect(
      undoStack.map((item) => item.getOperations().map((op) => omit(op, 'id')))
    ).toMatchSnapshot();
  });

  it('push with uri', () => {
    let uri = 'test';
    editor.handleInsertText({ index: 0, text: 'test' }, uri);
    expect(
      historyService.undoRedoService.getLastElement().getLastOperation().uri === uri
    ).toBeTruthy();
    editor.handleInsertText({ index: 4, text: 'aaa' });
    expect(
      historyService.undoRedoService.getLastElement().getLastOperation().uri === MOCK_URI
    ).toBeTruthy();
  });

  it('push operation with noApply', async () => {
    const text = editor.text;
    editor.handleInsertText({ index: 0, text: 'test' }, undefined, true);
    expect(editor.text).toEqual(text);
    editor.handleInsertText({ index: 0, text: 'test' }, undefined, false);
    expect(editor.text).not.toEqual(text);
  });

  it('dispose', async () => {
    const disposables = (historyService as any)._toDispose;
    historyService.dispose();
    expect(disposables.disposed).toEqual(true);
  });
});
