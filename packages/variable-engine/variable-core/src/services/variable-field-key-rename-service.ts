/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { difference } from 'lodash';
import { inject, injectable, postConstruct, preDestroy } from 'inversify';
import { DisposableCollection, Emitter } from '@flowgram.ai/utils';

import { VariableEngine } from '../variable-engine';
import {
  ASTNode,
  BaseVariableField,
  ObjectPropertiesChangeAction,
  VariableDeclarationListChangeAction,
} from '../ast';

interface RenameInfo {
  before: BaseVariableField;
  after: BaseVariableField;
}

@injectable()
export class VariableFieldKeyRenameService {
  @inject(VariableEngine) variableEngine: VariableEngine;

  toDispose = new DisposableCollection();

  renameEmitter = new Emitter<RenameInfo>();

  // 没有被 rename 的字段通过 disposeInList 透出，让业务区分变量是 rename 删除的，还是真正从列表中删除的
  disposeInListEmitter = new Emitter<BaseVariableField>();

  onRename = this.renameEmitter.event;

  onDisposeInList = this.disposeInListEmitter.event;

  handleFieldListChange(ast?: ASTNode, prev?: BaseVariableField[], next?: BaseVariableField[]) {
    // 1. 检查是否触发 ReName
    if (!ast || !prev?.length || !next?.length) {
      this.notifyFieldsDispose(prev, next);
      return;
    }

    // 2. 改动前后长度需要一致
    if (prev.length !== next.length) {
      this.notifyFieldsDispose(prev, next);
      return;
    }

    let renameNodeInfo: RenameInfo | null = null;
    let existFieldChanged = false;

    for (const [index, prevField] of prev.entries()) {
      const nextField = next[index];

      if (prevField.key !== nextField.key) {
        // 一次只能存在一行信息 ReName
        if (existFieldChanged) {
          this.notifyFieldsDispose(prev, next);
          return;
        }
        existFieldChanged = true;

        if (prevField.type?.kind === nextField.type?.kind) {
          renameNodeInfo = { before: prevField, after: nextField };
        }
      }
    }

    if (!renameNodeInfo) {
      this.notifyFieldsDispose(prev, next);
      return;
    }

    this.renameEmitter.fire(renameNodeInfo);
  }

  notifyFieldsDispose(prev?: BaseVariableField[], next?: BaseVariableField[]) {
    const removedFields = difference(prev || [], next || []);
    removedFields.forEach(_field => this.disposeInListEmitter.fire(_field));
  }

  @postConstruct()
  init() {
    this.toDispose.pushAll([
      this.variableEngine.onGlobalEvent<VariableDeclarationListChangeAction>(
        'VariableListChange',
        _action => {
          this.handleFieldListChange(_action.ast, _action.payload?.prev, _action.payload?.next);
        },
      ),
      this.variableEngine.onGlobalEvent<ObjectPropertiesChangeAction>(
        'ObjectPropertiesChange',
        _action => {
          this.handleFieldListChange(_action.ast, _action.payload?.prev, _action.payload?.next);
        },
      ),
    ]);
  }

  @preDestroy()
  dispose() {
    this.toDispose.dispose();
  }
}
