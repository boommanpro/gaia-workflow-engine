/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { injectable } from 'inversify';
import { Emitter, DisposableCollection } from '@flowgram.ai/utils';

import {
  IUndoRedoElement,
  IUndoRedoService,
  UndoRedoChangeType,
  UndoRedoChangeEvent,
  UndoRedoClearEvent,
} from './types';

@injectable()
export class UndoRedoService implements IUndoRedoService {
  private _undoStack: IUndoRedoElement[];

  private _redoStack: IUndoRedoElement[];

  private _undoing: boolean = false;

  private _redoing: boolean = false;

  private _limit: number = 100;

  protected onChangeEmitter = new Emitter<UndoRedoChangeEvent>();

  readonly onChange = this.onChangeEmitter.event;

  readonly _toDispose = new DisposableCollection();

  constructor() {
    this._undoStack = [];
    this._redoStack = [];
    this._toDispose.push(this.onChangeEmitter);
  }

  setLimit(limit: number) {
    this._limit = limit;
  }

  pushElement(element: IUndoRedoElement): void {
    this._redoStack = [];
    this._stackPush(this._undoStack, element);
    this._toDispose.push(element);
    this._emitChange(UndoRedoChangeType.PUSH, element);
  }

  getUndoStack() {
    return this._undoStack;
  }

  getRedoStack() {
    return this._redoStack;
  }

  getLastElement() {
    return this._undoStack[this._undoStack.length - 1];
  }

  /**
   * 执行undo
   * @returns void
   */
  async undo(): Promise<void> {
    if (!this.canUndo()) {
      return;
    }

    if (this._undoing) {
      return;
    }
    this._undoing = true;

    const item = this._undoStack.pop() as IUndoRedoElement;

    try {
      await item.undo();
    } finally {
      this._stackPush(this._redoStack, item);
      this._emitChange(UndoRedoChangeType.UNDO, item);
      this._undoing = false;
    }
  }

  /**
   * 执行redo
   * @returns void
   */
  async redo(): Promise<void> {
    if (!this.canRedo()) {
      return;
    }

    if (this._redoing) {
      return;
    }
    this._redoing = true;

    const item = this._redoStack.pop() as IUndoRedoElement;

    try {
      await item.redo();
    } finally {
      this._stackPush(this._undoStack, item);
      this._emitChange(UndoRedoChangeType.REDO, item);
      this._redoing = false;
    }
  }

  /**
   * 是否可undo
   * @returns true代表可以，false代表不可以
   */
  canUndo(): boolean {
    return this._undoStack.length > 0;
  }

  /**
   * 是否可redo
   * @returns true代表可以，false代表不可以
   */
  canRedo(): boolean {
    return this._redoStack.length > 0;
  }

  /**
   * 是否可以push
   * @returns true代表可以，false代表不可以
   */
  canPush(): boolean {
    return !this._redoing && !this._undoing;
  }

  /**
   * 清空
   */
  clear() {
    this.clearRedoStack();
    this.clearUndoStack();
    this._emitChange(UndoRedoChangeType.CLEAR);
  }

  /**
   * 清空redo栈
   */
  clearRedoStack(): void {
    this._redoStack.forEach(element => {
      element.dispose();
    });
    this._redoStack = [];
  }

  /**
   * 清空undo栈
   */
  clearUndoStack(): void {
    this._undoStack.forEach(element => {
      element.dispose();
    });
    this._undoStack = [];
  }

  /**
   * 销毁
   */
  dispose(): void {
    this.clear();
    this._toDispose.dispose();
  }

  private _stackPush(stack: IUndoRedoElement[], element: IUndoRedoElement) {
    stack.push(element);
    if (stack.length > this._limit) {
      stack.shift();
    }
  }

  private _emitChange(type: UndoRedoChangeType, element?: IUndoRedoElement) {
    if (element) {
      this.onChangeEmitter.fire({ type, element });
    } else {
      this.onChangeEmitter.fire({ type } as UndoRedoClearEvent);
    }
  }
}
