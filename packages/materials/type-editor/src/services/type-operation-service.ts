/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { isEqual } from 'lodash-es';
import { injectable } from 'inversify';
import { IJsonSchema } from '@flowgram.ai/json-schema';

import { MonitorData } from '../utils';

interface StackItem {
  id: string;
  value: string;
}

// 操作注册
@injectable()
export class TypeEditorOperationService<TypeSchema extends Partial<IJsonSchema>> {
  public undoStack: StackItem[] = [];

  public redoStack: StackItem[] = [];

  private _id_idx = 0;

  private _getNewId(): string {
    return `${this._id_idx++}`;
  }

  public _storeState = (value: TypeSchema) => {
    if (this.redoStack.length > 0) {
      this.redoStack.splice(0);
    }

    this.undoStack.push({
      id: this._getNewId(),
      value: JSON.stringify(value),
    });
    this.refreshUndoRedoStatus();
  };

  public canUndo = new MonitorData(false);

  public canRedo = new MonitorData(false);

  public constructor() {
    this.refreshUndoRedoStatus();
  }

  public refreshUndoRedoStatus() {
    this.canRedo.update(this.redoStack.length !== 0);
    this.canUndo.update(this.undoStack.length > 1);
  }

  public getCurrentState(): TypeSchema | undefined {
    const top = this.undoStack[this.undoStack.length - 1];

    if (top) {
      return JSON.parse(top.value);
    }
    return;
  }

  public clear(): void {
    this.undoStack = [];
    this.redoStack = [];
  }

  public storeState(value: TypeSchema): void {
    if (isEqual(this.getCurrentState(), value)) {
      return;
    }

    this._storeState(value);
  }

  public async undo(): Promise<void> {
    const top = this.undoStack.pop();
    if (top) {
      this.redoStack.push(top);
    }

    this.refreshUndoRedoStatus();
  }

  public async redo(): Promise<void> {
    const top = this.redoStack.pop();

    if (top) {
      this.undoStack.push(top);
    }

    this.refreshUndoRedoStatus();
  }

  public debugger(): void {
    console.log('getCurrentState - debugger', this.getCurrentState());
  }
}
