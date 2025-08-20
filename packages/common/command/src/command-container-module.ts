/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { ContainerModule } from 'inversify';
import { bindContributionProvider } from '@flowgram.ai/utils';

import { CommandService } from './command-service';
import { CommandRegistry, CommandRegistryFactory, CommandContribution } from './command';

export const CommandContainerModule = new ContainerModule(bind => {
  bindContributionProvider(bind, CommandContribution);
  bind(CommandRegistry).toSelf().inSingletonScope();
  bind(CommandService).toService(CommandRegistry);
  bind(CommandRegistryFactory).toFactory(ctx => () => ctx.container.get(CommandRegistry));
});
