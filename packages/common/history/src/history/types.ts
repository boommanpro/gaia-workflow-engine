/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { Disposable } from '@flowgram.ai/utils';

import { HistoryOperation, Operation } from '../operation';
import { HistoryService } from './history-service';

export interface HistoryRecord {
  snapshot: any;
  stack: any[];
}

export interface HistoryItem extends HistoryStackItem {
  id: string;
  time: string;
  operations: HistoryOperation[];
}

/**
 * 历史服务管理
 */
export interface IHistoryManager {
  /**
   * 注册历史服务
   * @param service 历史服务示例
   */
  registerHistoryService(service: IHistoryService): void;
  /**
   * 取消注册历史服务
   * @param service 历史服务示例
   */
  unregisterHistoryService(service: HistoryService): void;
}

/**
 * 历史服务
 */
export interface IHistoryService extends Disposable {
  /**
   * 添加操作
   * @param operation 操作
   */
  pushOperation(operation: Operation): void | Promise<void>;
  /**
   * 获取所有历史操作
   */
  getHistoryOperations(): Operation[];
  /**
   * 撤回
   */
  undo(): void | Promise<void>;
  /**
   * 重做
   */
  redo(): void | Promise<void>;
  /**
   * 是否有可撤销的操作
   */
  canUndo(): boolean;
  /**
   * 是否有可重做的操作
   */
  canRedo(): boolean;
  /**
   * 获取历史记录
   */
  getRecords(): Promise<HistoryRecord[]>;
  /**
   * 根据历史版本重新存储历史记录
   * @param historyRecord 历史记录
   */
  restore(historyRecord: HistoryRecord): Promise<void>;
  /**
   * 清空undo/redo
   */
  clear(): void;
  /**
   * 最大数量限制
   * @param num 数量
   */
  limit(num: number): void;
  /**
   * 返回快照
   */
  getSnapshot(): unknown;
}

export interface IOperationService {
  pushOperation(operation: Operation): void;
}

/**
 * UndoRedo服务
 */
export interface IUndoRedoService extends Disposable {
  /**
   * 添加一个undo/redo元素
   * @param element 可undo/redo的元素
   */
  pushElement(element: IUndoRedoElement): void;
  /**
   * 获取最后一个可undo的元素
   */
  getLastElement(): IUndoRedoElement;
  /**
   * 获取undo栈
   */
  getUndoStack(): IUndoRedoElement[];
  /**
   * 获取redo栈
   */
  getRedoStack(): IUndoRedoElement[];
  /**
   * 清空redo栈
   */
  clearRedoStack(): void;
  /**
   * 是否可undo
   */
  canUndo(): boolean;
  /**
   * 执行undo
   */
  undo(): Promise<void> | void;
  /**
   * 是否可redo
   */
  canRedo(): boolean;
  /**
   * 执行redo
   */
  redo(): Promise<void> | void;
  /**
   * 清空 undo和redo栈
   */
  clear(): void;
}

/**
 * UndoRedo元素
 */
export interface IUndoRedoElement extends Disposable {
  /**
   * 操作标题
   */
  readonly label?: string;
  /**
   * 操作描述
   */
  readonly description?: string;
  /**
   * 撤销
   */
  undo(): Promise<void> | void;
  /**
   * 重做
   */
  redo(): Promise<void> | void;
  /**
   * 添加一个操作
   * @param operation 操作
   */
  pushOperation(operation: Operation): Operation;
  /**
   * 获取所有操作
   */
  getOperations(): Operation[];
  /**
   * 获取第一个操作
   */
  getFirstOperation(): Operation;
  /**
   * 获取最后一个操作
   */
  getLastOperation(): Operation;
  /**
   * 获取修改的操作
   */
  getChangeOperations(type: UndoRedoChangeType): Operation[];
}

/**
 * 操作注册
 */
export interface IOperationRegistry {
  register(type: string, factory: IUndoRedoElementFactory<unknown>): void;
}

/**
 * 操作工厂
 */
export type IUndoRedoElementFactory<OperationValue> = (
  operation: Operation<OperationValue>
) => IUndoRedoElement;

/**
 * undo redo 类型
 */
export enum UndoRedoChangeType {
  UNDO = 'undo',
  REDO = 'redo',
  PUSH = 'push',
  CLEAR = 'clear',
}

/**
 * 带element的事件
 */
export interface UndoRedoChangeElementEvent {
  type: UndoRedoChangeType.PUSH | UndoRedoChangeType.UNDO | UndoRedoChangeType.REDO;
  element: IUndoRedoElement;
}
/**
 * 清空事件
 */
export interface UndoRedoClearEvent {
  type: UndoRedoChangeType.CLEAR;
}
/**
 * undo redo变化事件
 */
export type UndoRedoChangeEvent = UndoRedoChangeElementEvent | UndoRedoClearEvent;

export interface HistoryStackItem {
  id: string;
  type: UndoRedoChangeType;
  timestamp: number;
  operations: Operation[];
  uri?: string;
}

/**
 * 历史栈变化类型
 */
export enum HistoryStackChangeType {
  ADD = 'add',
  UPDATE = 'update',
  CLEAR = 'clear',
  ADD_OPERATION = 'add_operation',
  UPDATE_OPERATION = 'update_operation',
}

/**
 * 历史栈变化事件基础
 */
export interface HistoryStackBaseEvent {
  type: HistoryStackChangeType;
  value?: any;
  service: HistoryService;
}

/**
 * 添加历史事件
 */
export interface HistoryStackAddEvent extends HistoryStackBaseEvent {
  type: HistoryStackChangeType.ADD;
  value: HistoryItem;
}

/**
 * 更新历史事件
 */
export interface HistoryStackUpdateEvent extends HistoryStackBaseEvent {
  type: HistoryStackChangeType.UPDATE;
  value: HistoryItem;
}

/**
 * 添加操作事件
 */
export interface HistoryStackAddOperationEvent extends HistoryStackBaseEvent {
  type: HistoryStackChangeType.ADD_OPERATION;
  value: {
    historyItem: HistoryItem;
    operation: HistoryOperation;
  };
}

/**
 * 更新操作事件
 */
export interface HistoryStackUpdateOperationEvent extends HistoryStackBaseEvent {
  type: HistoryStackChangeType.UPDATE_OPERATION;
  value: {
    historyItem: HistoryItem;
    operation: HistoryOperation;
  };
}

/**
 * 历史记录变化事件
 */
export type HistoryStackChangeEvent =
  | HistoryStackAddEvent
  | HistoryStackUpdateEvent
  | HistoryStackAddOperationEvent
  | HistoryStackUpdateOperationEvent;

export enum HistoryMergeEventType {
  ADD = 'ADD',
  UPDATE = 'UPDATE',
}

/**
 * 历史合并事件
 */
export type HistoryMergeEvent =
  | {
      type: HistoryMergeEventType.ADD;
      value: {
        element: IUndoRedoElement;
        operation: Operation;
      };
    }
  | {
      type: HistoryMergeEventType.UPDATE;
      value: {
        element: IUndoRedoElement;
        operation: Operation;
        value: any;
      };
    };
