/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { parseTypeJsonOrKind } from '../utils/helpers';
import { ASTKind, ASTNodeJSON, ASTNodeJSONOrKind } from '../types';
import { ASTNodeFlags } from '../flags';
import { type BaseVariableField } from '../declaration';
import { BaseType } from './base-type';

export interface ArrayJSON {
  items?: ASTNodeJSONOrKind;
}

export class ArrayType extends BaseType<ArrayJSON> {
  public flags: ASTNodeFlags = ASTNodeFlags.DrilldownType | ASTNodeFlags.EnumerateType;

  static kind: string = ASTKind.Array;

  items: BaseType;

  fromJSON({ items }: ArrayJSON): void {
    this.updateChildNodeByKey('items', parseTypeJsonOrKind(items));
  }

  // items 类型是否可下钻
  get canDrilldownItems(): boolean {
    return !!(this.items?.flags & ASTNodeFlags.DrilldownType);
  }

  getByKeyPath(keyPath: string[]): BaseVariableField | undefined {
    const [curr, ...rest] = keyPath || [];

    if (curr === '0' && this.canDrilldownItems) {
      // 数组第 0 项
      return this.items.getByKeyPath(rest);
    }

    return undefined;
  }

  public isTypeEqual(targetTypeJSONOrKind?: ASTNodeJSONOrKind): boolean {
    const targetTypeJSON = parseTypeJsonOrKind(targetTypeJSONOrKind);
    const isSuperEqual = super.isTypeEqual(targetTypeJSONOrKind);

    if (targetTypeJSON?.weak || targetTypeJSON?.kind === ASTKind.Union) {
      return isSuperEqual;
    }

    return (
      targetTypeJSON &&
      isSuperEqual &&
      // 弱比较，只需要比较 Kind 即可
      (targetTypeJSON?.weak || this.customStrongEqual(targetTypeJSON))
    );
  }

  /**
   * Array 强比较
   * @param targetTypeJSON
   * @returns
   */
  protected customStrongEqual(targetTypeJSON: ASTNodeJSON): boolean {
    if (!this.items) {
      return !(targetTypeJSON as ArrayJSON)?.items;
    }
    return this.items?.isTypeEqual((targetTypeJSON as ArrayJSON).items);
  }

  toJSON(): ASTNodeJSON {
    return {
      kind: ASTKind.Array,
      items: this.items?.toJSON(),
    };
  }
}
