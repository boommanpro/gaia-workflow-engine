/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

import {
  OperationService,
  StackOperation,
  UndoRedoChangeEvent,
  UndoRedoChangeType,
  UndoRedoService,
} from '../src';
import { createHistoryContainer } from '../__mocks__/history-container.mock';

describe('operation-registry', () => {
  let undoRedoService: UndoRedoService;
  let container;
  let createStackOperation = (operations = []) =>
    new StackOperation(container.get(OperationService), operations);
  beforeEach(() => {
    container = createHistoryContainer();
    undoRedoService = container.get(UndoRedoService);
  });

  it('pushElement', () => {
    const element = createStackOperation();
    undoRedoService.pushElement(element);
    expect(undoRedoService.getUndoStack()).toEqual([element]);
  });

  it('getUndoStack', () => {
    const element = createStackOperation();
    undoRedoService.pushElement(element);
    expect(undoRedoService.getUndoStack()).toEqual([element]);
  });

  it('getRedoStack', () => {
    const element = createStackOperation();
    undoRedoService.pushElement(element);
    expect(undoRedoService.getRedoStack()).toEqual([]);
  });

  it('clearRedoStack', () => {
    const element = createStackOperation();
    undoRedoService.pushElement(element);
    undoRedoService.clearRedoStack();
    expect(undoRedoService.getRedoStack()).toEqual([]);
  });

  it('undo', async () => {
    const element = createStackOperation();
    await undoRedoService.undo();
    undoRedoService.pushElement(element);
    await undoRedoService.undo();
    expect(undoRedoService.getUndoStack()).toEqual([]);
  });

  it('undo twice will only revert once', async () => {
    const element = createStackOperation();
    undoRedoService.pushElement(element);
    undoRedoService.pushElement(element);
    undoRedoService.undo();
    undoRedoService.undo();
    expect(undoRedoService.getUndoStack()).toEqual([element]);
  });

  it('redo', async () => {
    const element = createStackOperation();
    undoRedoService.pushElement(element);
    await undoRedoService.undo();
    await undoRedoService.redo();
    expect(undoRedoService.getUndoStack()).toEqual([element]);
  });

  it('canUndo', () => {
    const element = createStackOperation();
    expect(undoRedoService.canUndo()).toEqual(false);
    undoRedoService.pushElement(element);
    expect(undoRedoService.canUndo()).toEqual(true);
  });

  it('canRedo', async () => {
    const element = createStackOperation();
    expect(undoRedoService.canRedo()).toEqual(false);
    undoRedoService.pushElement(element);
    expect(undoRedoService.canRedo()).toEqual(false);
    await undoRedoService.undo();
    expect(undoRedoService.canRedo()).toEqual(true);
  });

  it('change event', async () => {
    const element = createStackOperation();
    const events: UndoRedoChangeEvent[] = [];
    undoRedoService.onChange(e => events.push(e));
    undoRedoService.pushElement(element);
    await undoRedoService.undo();
    await undoRedoService.redo();
    expect(events.map(e => e.type)).toMatchSnapshot();
  });

  it('clear', () => {
    const fn = vi.fn();
    const element = createStackOperation();
    undoRedoService.pushElement(element);
    undoRedoService.pushElement(element);
    undoRedoService.onChange(event => {
      if (event.type === UndoRedoChangeType.CLEAR) {
        fn();
      }
    });
    undoRedoService.undo();
    undoRedoService.clear();
    expect(undoRedoService.getUndoStack()).toEqual([]);
    expect(undoRedoService.getRedoStack()).toEqual([]);
    expect(fn).toBeCalledTimes(1);
  });
});
