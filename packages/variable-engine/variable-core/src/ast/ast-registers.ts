/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { omit } from 'lodash';
import { injectable } from 'inversify';

import { POST_CONSTRUCT_AST_SYMBOL } from './utils/inversify';
import { ASTKindType, ASTNodeJSON, CreateASTParams, NewASTAction } from './types';
import { ArrayType } from './type/array';
import {
  BooleanType,
  CustomType,
  IntegerType,
  MapType,
  NumberType,
  ObjectType,
  StringType,
} from './type';
import {
  EnumerateExpression,
  // KeyPathExpression,
  KeyPathExpressionV2,
  WrapArrayExpression,
} from './expression';
import { Property, VariableDeclaration, VariableDeclarationList } from './declaration';
import { DataNode, MapNode } from './common';
import { ASTNode, ASTNodeRegistry } from './ast-node';

type DataInjector = () => Record<string, any>;

@injectable()
export class ASTRegisters {
  protected injectors: Map<ASTKindType, DataInjector> = new Map();

  protected astMap: Map<ASTKindType, ASTNodeRegistry> = new Map();

  /**
   * 核心 AST 节点注册
   */
  constructor() {
    this.registerAST(StringType);
    this.registerAST(NumberType);
    this.registerAST(BooleanType);
    this.registerAST(IntegerType);
    this.registerAST(ObjectType);
    this.registerAST(ArrayType);
    this.registerAST(MapType);
    this.registerAST(CustomType);
    this.registerAST(Property);
    this.registerAST(VariableDeclaration);
    this.registerAST(VariableDeclarationList);
    // this.registerAST(KeyPathExpression);
    this.registerAST(KeyPathExpressionV2);

    this.registerAST(EnumerateExpression);
    this.registerAST(WrapArrayExpression);
    this.registerAST(MapNode);
    this.registerAST(DataNode);
  }

  /**
   * 创建 AST 节点
   * @param param 创建参数
   * @returns
   */
  createAST<ReturnNode extends ASTNode = ASTNode>(
    json: ASTNodeJSON,
    { parent, scope }: CreateASTParams
  ): ReturnNode {
    const Registry = this.astMap.get(json.kind!);

    if (!Registry) {
      throw Error(`ASTKind: ${String(json.kind)} can not find its ASTNode Registry`);
    }

    const injector = this.injectors.get(json.kind!);

    const node = new Registry(
      {
        key: json.key,
        scope,
        parent,
      },
      injector?.() || {}
    ) as ReturnNode;

    // 初始化创建不触发 fireChange
    node.changeLocked = true;
    node.fromJSON(omit(json, ['key', 'kind']));
    node.changeLocked = false;

    node.dispatchGlobalEvent<NewASTAction>({ type: 'NewAST' });

    if (Reflect.hasMetadata(POST_CONSTRUCT_AST_SYMBOL, node)) {
      const postConstructKey = Reflect.getMetadata(POST_CONSTRUCT_AST_SYMBOL, node);
      (node[postConstructKey] as () => void)?.();
    }

    return node;
  }

  /**
   * 根据 AST 节点类型获取节点 Registry
   * @param kind
   * @returns
   */
  getASTRegistryByKind(kind: ASTKindType) {
    return this.astMap.get(kind);
  }

  /**
   * 注册 AST 节点
   * @param ASTNode
   * @param injector
   */
  registerAST(ASTNode: ASTNodeRegistry, injector?: DataInjector) {
    this.astMap.set(ASTNode.kind, ASTNode);
    if (injector) {
      this.injectors.set(ASTNode.kind, injector);
    }
  }
}
