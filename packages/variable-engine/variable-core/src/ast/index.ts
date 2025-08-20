/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

export {
  type ASTNodeJSON,
  ASTKind,
  type GetKindJSON,
  type GetKindJSONOrKind,
  type CreateASTParams,
  type GlobalEventActionType,
} from './types';
export { ASTRegisters } from './ast-registers';
export { ASTNode, type ASTNodeRegistry } from './ast-node';
export { ASTNodeFlags } from './flags';

export * from './common';
export * from './declaration';
export * from './type';
export * from './expression';

export { ASTFactory } from './factory';
export { ASTMatch } from './match';
export { injectToAST, postConstructAST } from './utils/inversify';
export { isMatchAST } from './utils/helpers';
