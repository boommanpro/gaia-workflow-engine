/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { parseTypeJsonOrKind } from '../utils/helpers';
import { ASTKind, ASTNodeJSON, ASTNodeJSONOrKind } from '../types';
import { BaseType } from './base-type';

export interface MapJSON {
  keyType?: ASTNodeJSONOrKind;
  valueType?: ASTNodeJSONOrKind;
}

export class MapType extends BaseType<MapJSON> {
  // public flags: ASTNodeFlags = ASTNodeFlags.DrilldownType | ASTNodeFlags.EnumerateType;

  static kind: string = ASTKind.Map;

  keyType: BaseType;

  valueType: BaseType;

  fromJSON({ keyType = ASTKind.String, valueType }: MapJSON): void {
    // Key 默认为 String
    this.updateChildNodeByKey('keyType', parseTypeJsonOrKind(keyType));
    this.updateChildNodeByKey('valueType', parseTypeJsonOrKind(valueType));
  }

  // Value 类型是否可下钻，后续实现
  // get canDrilldownValue(): boolean {
  //   return !!(this.valueType.flags & ASTNodeFlags.DrilldownType);
  // }

  // getByKeyPath(keyPath: string[]): BaseVariableField | undefined {
  //   const [curr, ...rest] = keyPath || [];

  //   if (curr === '*' && this.canDrilldownValue) {
  //     return this.valueType.getByKeyPath(rest);
  //   }

  //   return undefined;
  // }

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
   * Map 强比较
   * @param targetTypeJSON
   * @returns
   */
  protected customStrongEqual(targetTypeJSON: ASTNodeJSON): boolean {
    const { keyType = ASTKind.String, valueType } = targetTypeJSON as MapJSON;

    const isValueTypeEqual =
      (!valueType && !this.valueType) || this.valueType?.isTypeEqual(valueType);

    return isValueTypeEqual && this.keyType?.isTypeEqual(keyType);
  }

  toJSON(): ASTNodeJSON {
    return {
      kind: ASTKind.Map,
      keyType: this.keyType?.toJSON(),
      valueType: this.valueType?.toJSON(),
    };
  }
}
