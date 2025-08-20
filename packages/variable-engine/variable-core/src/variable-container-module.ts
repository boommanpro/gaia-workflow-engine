/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { ContainerModule } from 'inversify';

import { VariableEngine } from './variable-engine';
import { VariableFieldKeyRenameService } from './services';
import { ContainerProvider, VariableEngineProvider } from './providers';
import { ASTRegisters } from './ast';

export const VariableContainerModule = new ContainerModule(bind => {
  bind(VariableEngine).toSelf().inSingletonScope();
  bind(ASTRegisters).toSelf().inSingletonScope();

  bind(VariableFieldKeyRenameService).toSelf().inSingletonScope();

  // 提供 provider 注入 variableEngine，防止部分场景下的循环依赖
  bind(VariableEngineProvider).toDynamicValue(ctx => () => ctx.container.get(VariableEngine));

  // 提供 Container Provider 方便 AST 注入模块
  bind(ContainerProvider).toDynamicValue(ctx => () => ctx.container);
});
