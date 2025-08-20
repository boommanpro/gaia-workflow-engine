/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { ASTKind, ASTNodeJSON } from '../types';
import { ASTNode } from '../ast-node';

export interface ListNodeJSON {
  list: ASTNodeJSON[];
}

export class ListNode extends ASTNode<ListNodeJSON> {
  static kind: string = ASTKind.ListNode;

  protected _list: ASTNode[];

  get list(): ASTNode[] {
    return this._list;
  }

  fromJSON({ list }: ListNodeJSON): void {
    // 超出长度的 children 需要被销毁
    this._list.slice(list.length).forEach(_item => {
      _item.dispose();
      this.fireChange();
    });

    // 剩余 children 的处理
    this._list = list.map((_item, idx) => {
      const prevItem = this._list[idx];

      if (prevItem.kind !== _item.kind) {
        prevItem.dispose();
        this.fireChange();
        return this.createChildNode(_item);
      }

      prevItem.fromJSON(_item);
      return prevItem;
    });
  }

  toJSON(): ASTNodeJSON {
    return {
      kind: ASTKind.ListNode,
      list: this._list.map(item => item.toJSON()),
    };
  }
}
