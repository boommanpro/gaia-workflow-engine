/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { shallowEqual } from 'fast-equals';

import { ASTKind, ASTNodeJSON } from '../types';
import { ASTNode } from '../ast-node';

/**
 * 通用数据 AST 节点，无子节点
 */
export class DataNode<Data = any> extends ASTNode {
  static kind: string = ASTKind.DataNode;

  protected _data: Data;

  get data(): Data {
    return this._data;
  }

  fromJSON(json: Data): void {
    const { kind, ...restData } = json as ASTNodeJSON;

    if (!shallowEqual(restData, this._data)) {
      this._data = restData as unknown as Data;
      this.fireChange();
    }
  }

  toJSON() {
    return {
      kind: ASTKind.DataNode,
      ...this._data,
    };
  }

  partialUpdate(nextData: Data) {
    if (!shallowEqual(nextData, this._data)) {
      this._data = {
        ...this._data,
        ...nextData,
      };
      this.fireChange();
    }
  }
}
