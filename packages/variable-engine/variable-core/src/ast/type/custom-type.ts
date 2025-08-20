/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { parseTypeJsonOrKind } from '../utils/helpers';
import { ASTKind, ASTNodeJSONOrKind } from '../types';
import { type UnionJSON } from './union';
import { BaseType } from './base-type';

export interface CustomTypeJSON {
  typeName: string;
}

export class CustomType extends BaseType<CustomTypeJSON> {
  static kind: string = ASTKind.CustomType;

  protected _typeName: string;

  get typeName(): string {
    return this._typeName;
  }

  fromJSON(json: CustomTypeJSON): void {
    if (this._typeName !== json.typeName) {
      this._typeName = json.typeName;
      this.fireChange();
    }
  }

  public isTypeEqual(targetTypeJSONOrKind?: ASTNodeJSONOrKind): boolean {
    const targetTypeJSON = parseTypeJsonOrKind(targetTypeJSONOrKind);

    // 如果是 Union 类型，有一个子类型保持相等即可
    if (targetTypeJSON?.kind === ASTKind.Union) {
      return ((targetTypeJSON as UnionJSON)?.types || [])?.some((_subType) =>
        this.isTypeEqual(_subType)
      );
    }

    return targetTypeJSON?.kind === this.kind && targetTypeJSON?.typeName === this.typeName;
  }
}
