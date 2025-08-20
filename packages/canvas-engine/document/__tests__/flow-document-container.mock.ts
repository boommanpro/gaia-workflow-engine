/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { decorate, injectable, Container, type interfaces } from 'inversify';
import { EntityManager } from '@flowgram.ai/core';

import {
  type FlowDocument,
  FlowDocumentContainerModule,
  FlowDocumentContribution,
  FlowNodeRenderData,
  FlowNodeTransformData,
  FlowNodeTransitionData,
} from '../src';

export class FlowDocumentMockRegister implements FlowDocumentContribution {
  registerDocument(document: FlowDocument) {
    document.registerNodeDatas(FlowNodeTransformData, FlowNodeRenderData, FlowNodeTransitionData);
  }
}

decorate(injectable(), FlowDocumentMockRegister);

export function createDocumentContainer(): interfaces.Container {
  const container = new Container();
  container.load(FlowDocumentContainerModule);
  container.bind(EntityManager).toSelf();
  container.bind(FlowDocumentContribution).to(FlowDocumentMockRegister);
  return container;
}
