/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { injectable, interfaces } from 'inversify';
import { Scope, VariableEngine } from '@flowgram.ai/variable-core';

@injectable()
export class GlobalScope extends Scope {
  static readonly ID = Symbol('GlobalScope');

  static is(scope: Scope) {
    return scope.id === GlobalScope.ID;
  }
}

export const bindGlobalScope = (bind: interfaces.Bind) => {
  bind(GlobalScope).toDynamicValue((ctx) => {
    const variableEngine = ctx.container.get(VariableEngine);
    let scope = variableEngine.getScopeById(GlobalScope.ID) as GlobalScope;

    if (!scope) {
      scope = variableEngine.createScope(
        GlobalScope.ID,
        {},
        { ScopeConstructor: GlobalScope }
      ) as GlobalScope;
      variableEngine.chain.refreshAllChange();
    }

    return scope;
  });
};
