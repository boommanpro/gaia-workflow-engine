/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { ASTKind, ASTNodeJSON } from '../types';
import { GlobalEventActionType } from '../types';
import { ASTNode } from '../ast-node';
import { type VariableDeclarationJSON, VariableDeclaration } from './variable-declaration';

export interface VariableDeclarationListJSON<VariableMeta = any> {
  /**
   *  declarations 一定是 VariableDeclaration 类型，因此业务可以不用填 kind
   */
  declarations?: VariableDeclarationJSON<VariableMeta>[];
  startOrder?: number; // 变量起始的排序序号
}

export type VariableDeclarationListChangeAction = GlobalEventActionType<
  'VariableListChange',
  {
    prev: VariableDeclaration[];
    next: VariableDeclaration[];
  },
  VariableDeclarationList
>;

export class VariableDeclarationList extends ASTNode<VariableDeclarationListJSON> {
  static kind: string = ASTKind.VariableDeclarationList;

  declarationTable: Map<string, VariableDeclaration> = new Map();

  declarations: VariableDeclaration[];

  fromJSON({ declarations, startOrder }: VariableDeclarationListJSON): void {
    const removedKeys = new Set(this.declarationTable.keys());
    const prev = [...(this.declarations || [])];

    // 遍历新的 properties
    this.declarations = (declarations || []).map(
      (declaration: VariableDeclarationJSON, idx: number) => {
        const order = (startOrder || 0) + idx;

        // 如果没有设置 key，则复用上次的 key
        const declarationKey = declaration.key || this.declarations?.[idx]?.key;
        const existDeclaration = this.declarationTable.get(declarationKey);
        if (declarationKey) {
          removedKeys.delete(declarationKey);
        }

        if (existDeclaration) {
          existDeclaration.fromJSON({ order, ...declaration });

          return existDeclaration;
        } else {
          const newDeclaration = this.createChildNode({
            order,
            ...declaration,
            kind: ASTKind.VariableDeclaration,
          }) as VariableDeclaration;
          this.fireChange();

          this.declarationTable.set(newDeclaration.key, newDeclaration);

          return newDeclaration;
        }
      },
    );

    // 删除没有出现过的变量
    removedKeys.forEach(key => {
      const declaration = this.declarationTable.get(key);
      declaration?.dispose();
      this.declarationTable.delete(key);
    });

    this.dispatchGlobalEvent<VariableDeclarationListChangeAction>({
      type: 'VariableListChange',
      payload: {
        prev,
        next: [...this.declarations],
      },
    });
  }

  toJSON(): ASTNodeJSON {
    return {
      kind: ASTKind.VariableDeclarationList,
      properties: this.declarations.map(_declaration => _declaration.toJSON()),
    };
  }
}
