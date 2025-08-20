/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { xor } from 'lodash';

import { parseTypeJsonOrKind } from '../utils/helpers';
import { ASTNodeJSON, ASTKind, ASTNodeJSONOrKind, type GlobalEventActionType } from '../types';
import { ASTNodeFlags } from '../flags';
import { Property, type PropertyJSON } from '../declaration/property';
import { BaseType } from './base-type';

export interface ObjectJSON<VariableMeta = any> {
  /**
   *  Object 的 properties 一定是 Property 类型，因此业务可以不用填 kind
   */
  properties?: PropertyJSON<VariableMeta>[];
}

export type ObjectPropertiesChangeAction = GlobalEventActionType<
  'ObjectPropertiesChange',
  {
    prev: Property[];
    next: Property[];
  },
  ObjectType
>;

export class ObjectType extends BaseType<ObjectJSON> {
  public flags: ASTNodeFlags = ASTNodeFlags.DrilldownType;

  static kind: string = ASTKind.Object;

  propertyTable: Map<string, Property> = new Map();

  properties: Property[];

  fromJSON({ properties }: ObjectJSON): void {
    const removedKeys = new Set(this.propertyTable.keys());
    const prev = [...(this.properties || [])];

    // 遍历新的 properties
    this.properties = (properties || []).map((property: PropertyJSON) => {
      const existProperty = this.propertyTable.get(property.key);
      removedKeys.delete(property.key);

      if (existProperty) {
        existProperty.fromJSON(property as PropertyJSON);

        return existProperty;
      } else {
        const newProperty = this.createChildNode({
          ...property,
          kind: ASTKind.Property,
        }) as Property;

        this.fireChange();

        this.propertyTable.set(property.key, newProperty);
        // TODO 子节点主动销毁时，删除表格中的信息

        return newProperty;
      }
    });

    // 删除没有出现过的 property
    removedKeys.forEach((key) => {
      const property = this.propertyTable.get(key);
      property?.dispose();
      this.propertyTable.delete(key);
      this.fireChange();
    });

    this.dispatchGlobalEvent<ObjectPropertiesChangeAction>({
      type: 'ObjectPropertiesChange',
      payload: {
        prev,
        next: [...this.properties],
      },
    });
  }

  toJSON(): ASTNodeJSON {
    return {
      kind: ASTKind.Object,
      properties: this.properties.map((_property) => _property.toJSON()),
    };
  }

  /**
   * 根据 KeyPath 找到对应的变量
   * @param keyPath 变量路径
   * @returns
   */
  getByKeyPath(keyPath: string[]): Property | undefined {
    const [curr, ...restKeyPath] = keyPath;

    const property = this.propertyTable.get(curr);

    // 找到头了
    if (!restKeyPath.length) {
      return property;
    }

    // 否则继续往下找
    if (property?.type && property?.type?.flags & ASTNodeFlags.DrilldownType) {
      return property.type.getByKeyPath(restKeyPath) as Property | undefined;
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
   * Object 类型强比较
   * @param targetTypeJSON
   * @returns
   */
  protected customStrongEqual(targetTypeJSON: ASTNodeJSON): boolean {
    const targetProperties = (targetTypeJSON as ObjectJSON).properties || [];

    const sourcePropertyKeys = Array.from(this.propertyTable.keys());
    const targetPropertyKeys = targetProperties.map((_target) => _target.key);

    const isKeyStrongEqual = !xor(sourcePropertyKeys, targetPropertyKeys).length;

    return (
      isKeyStrongEqual &&
      targetProperties.every((targetProperty) => {
        const sourceProperty = this.propertyTable.get(targetProperty.key);

        return (
          sourceProperty &&
          sourceProperty.key === targetProperty.key &&
          sourceProperty.type?.isTypeEqual(targetProperty?.type)
        );
      })
    );
  }
}
