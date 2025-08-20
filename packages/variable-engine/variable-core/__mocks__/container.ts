/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { Container, ContainerModule, interfaces } from 'inversify';
import { ScopeChain, VariableContainerModule } from '../src';
import { MockScopeChain } from './mock-chain';
import { createPlaygroundContainer } from '@flowgram.ai/core';

export function getContainer(customModule?: interfaces.ContainerModuleCallBack): Container {
  const container = createPlaygroundContainer() as Container;
  container.load(VariableContainerModule);
  container.bind(ScopeChain).to(MockScopeChain).inSingletonScope();

  if(customModule) {
    container.load(new ContainerModule(customModule))
  }

  return container;
}
