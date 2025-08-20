/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { Container, ContainerModule, type interfaces } from 'inversify';
import { bindContributions } from '@flowgram.ai/utils';
import { EditorRegister, Editor } from './editor.mock'

import {
  OperationContribution,
  HistoryContainerModule,
} from '../src';

const TestContainerModule = new ContainerModule(bind => {
  bind(Editor).toSelf().inSingletonScope();
  bindContributions(bind, EditorRegister, [OperationContribution]);
});

export function createHistoryContainer(name?: string, parent?: interfaces.Container): interfaces.Container {
  const container = new Container();
  if (parent) {
    container.parent = parent;
  }
  if (name) {
    (container as any).name = name
  }
  container.load(HistoryContainerModule);
  container.load(TestContainerModule);
  return container;
}
