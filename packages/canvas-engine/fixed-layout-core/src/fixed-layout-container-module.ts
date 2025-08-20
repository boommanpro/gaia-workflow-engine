/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { ContainerModule } from 'inversify';
import { FlowRendererContribution } from '@flowgram.ai/renderer';
import { FlowDocumentContribution } from '@flowgram.ai/document';
import { PlaygroundContribution } from '@flowgram.ai/core';
import { bindContributions } from '@flowgram.ai/utils';

import { FlowRegisters } from './flow-registers';

export const FixedLayoutContainerModule = new ContainerModule(bind => {
  bindContributions(bind, FlowRegisters, [
    FlowDocumentContribution,
    FlowRendererContribution,
    PlaygroundContribution,
  ]);
});
