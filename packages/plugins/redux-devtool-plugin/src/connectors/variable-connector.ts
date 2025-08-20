/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { inject, injectable } from 'inversify';
import { Scope, VariableEngine } from '@flowgram.ai/variable-core';

import { BaseConnector } from './base';

@injectable()
export class VariableConnector extends BaseConnector {
  @inject(VariableEngine) protected variableEngine: VariableEngine;

  /**
   * 缓存变量状态
   */
  scopes: Record<string, any> = {};

  getName(): string {
    return '@flowgram.ai/VariableEngine';
  }

  getState() {
    return { scopes: this.scopes, variables: this.variableEngine.globalVariableTable.variables };
  }

  getScopeState(scope: Scope) {
    return {
      ast: scope?.ast.toJSON(),
      output: scope.output.variables,
      available: scope.available.variables,
    };
  }

  onInit() {
    this.variableEngine.onScopeChange((action) => {
      const { scope, type } = action;

      if (type === 'delete') {
        delete this.scopes[String(scope.id)];
      } else {
        this.scopes = {
          ...this.scopes,
          [scope.id]: this.getScopeState(scope),
        };
      }

      this.send(`${type}/${String(scope.id)}`);
    });
  }
}
