/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { decorate, inject, injectable, postConstruct } from 'inversify';

import {
  HistoryService,
  Operation,
  OperationContribution,
  OperationMeta,
  OperationRegistry,
  StackOperation,
} from '../src';

interface Node {
  id: number;
  data: any;
  children: Node[];
}

interface NodeOperationValue {
  parentId: number;
  index: number;
  node: Node;
}

interface TextOperationValue {
  index: number;
  text: string;
}

enum OperationType {
  insertNode = 'insert-node',
  deleteNode = 'delete-node',
  insertText = 'insert-text',
  deleteText = 'delete-text',
  selection = 'selection',
  mergeByTime = 'mergeByTime',
}

export function defaultRoot() {
  return {
    id: 1,
    data: 'test',
    children: [],
  }
}

export const MOCK_URI = 'file:///mock URI'

@injectable()
export class Editor {
  @inject(HistoryService)
  private historyService: HistoryService;

  @postConstruct()
  init() {
    this.historyService.context.source = this;
  }

  public node: Node = defaultRoot();

  public text: string = '';

  reset() {
    this.node = defaultRoot()
  }

  async undo() {
    await this.historyService.undo()
  }

  async redo() {
    await this.historyService.redo()
  }

  canRedo() {
    return this.historyService.canRedo()
  }

  canUndo() {
    return this.historyService.canUndo()
  }

  getHistoryOperations() {
    return this.historyService.getHistoryOperations()
  }

  handleSelection() {
    this.historyService.pushOperation({ type: OperationType.selection, value: {} })
  }

  handleInsert(value: NodeOperationValue) {
    this.historyService.pushOperation({ type: OperationType.insertNode, value })
  }

  handleInsertText(value: TextOperationValue, uri?: string, noApply?: boolean) {
    this.historyService.pushOperation({ type: OperationType.insertText, value, uri }, { noApply })
  }

  handleDeleteText(value: TextOperationValue) {
    this.historyService.pushOperation({ type: OperationType.deleteText, value }, { noApply: true})
  }

  handleMultiOperation() {
    this.historyService.pushOperation({ type: OperationType.mergeByTime, value: { test: 1} })
    this.historyService.pushOperation({ type: OperationType.mergeByTime, value: { test: 2} })
    this.historyService.pushOperation({ type: OperationType.mergeByTime, value: { test: 3} })
    this.historyService.pushOperation({ type: OperationType.mergeByTime, value: { test: 4} })
  }

  insertNode(value: NodeOperationValue) {
    const { parentId, index, node } = value;
    const parent = this.findNodeById(parentId);

    if (!parent) {
      return
    }
    parent.children.splice(index, 0, node);
  }

  deleteNode(value: NodeOperationValue) {
    const { parentId, index } = value;
    const parent = this.findNodeById(parentId);

    if (!parent) {
      return
    }
    parent.children.splice(index, 1);
  }

  insertText(value: TextOperationValue) {
    const { index, text } = value;
    this.text = this.text.slice(0, index) + text + this.text.slice(index);
  }

  deleteText(value: TextOperationValue) {
    const { index, text } = value;
    this.text = this.text.slice(0, index) + this.text.slice(index + text.length);
  }

  findNodeById(id: number): Node | null {
    const nodes = [this.node];
    while (nodes.length) {
      const node = nodes.shift() as Node;
      if (node.id === id) return node
      nodes.push(...node.children);
    }
    return null;
  }

  testTransact() {
    this.historyService.transact(() => {
      this.handleInsertText({ index: 0, text: 'test' })
      this.handleInsertText({ index: 4, text: 'test' })
    })
  }
}

export const insertNodeOperationMeta: OperationMeta = {
  type: OperationType.insertNode,
  inverse: (op: Operation) => ({ type: OperationType.deleteNode, value: op.value }),
  apply: (op: Operation, source: Editor) => {
    source.insertNode(op.value as NodeOperationValue)
  },
  getLabel: (op: Operation) => {
    const value = op.value as NodeOperationValue;
    return `插入节点${value?.node?.id}`
  }
};

export const deleteNodeOperationMeta: OperationMeta = {
  type: OperationType.deleteNode,
  inverse: (op: Operation) => ({ type: OperationType.insertNode, value: op.value }),
  apply: (op: Operation, source: Editor) => {
    source.deleteNode(op.value as NodeOperationValue)
  },
};

export const insertTextOperationMeta: OperationMeta = {
  type: OperationType.insertText,
  inverse: (op: Operation) => ({ type: OperationType.deleteText, value: op.value }),
  apply: (op: Operation, source: Editor) => {
    source.insertText(op.value as TextOperationValue)
  },
  shouldMerge: (op: Operation, prev: Operation | undefined) => true,
  getURI: () => MOCK_URI,
};

export const deleteTextOperationMeta: OperationMeta = {
  type: OperationType.deleteText,
  inverse: (op: Operation) => ({ type: OperationType.deleteText, value: op.value }),
  apply: (op: Operation, source: Editor) => {
    source.deleteText(op.value as TextOperationValue)
  },
  shouldMerge: (op: Operation, prev: Operation | undefined) => op,
};

export const selectionOperationMeta: OperationMeta = {
  type: OperationType.selection,
  inverse: (op: Operation) => ({ type: OperationType.selection, value: op.value }),
  apply: (op: Operation, source: Editor) => {
  },
  shouldSave: (op: Operation) => false,
};

export const mergeByTimeOperationMeta: OperationMeta = {
  type: OperationType.mergeByTime,
  inverse: (op: Operation) => ({ type: OperationType.mergeByTime, value: op.value }),
  apply: (op: Operation, source: Editor) => {
  },
  shouldMerge: (op: Operation, prev: Operation | undefined, stackItem: StackOperation) => {
    if (Date.now() - stackItem.getTimestamp() < 100) {
      return true
    }
    return false
  },
};


export class EditorRegister implements OperationContribution {
  registerOperationMeta(operationRegistry: OperationRegistry): void {
    operationRegistry.registerOperationMeta(insertNodeOperationMeta);
    operationRegistry.registerOperationMeta(deleteNodeOperationMeta);
    operationRegistry.registerOperationMeta(insertTextOperationMeta);
    operationRegistry.registerOperationMeta(deleteTextOperationMeta);
    operationRegistry.registerOperationMeta(selectionOperationMeta);
    operationRegistry.registerOperationMeta(mergeByTimeOperationMeta);
  }
}
decorate(injectable(), EditorRegister);
