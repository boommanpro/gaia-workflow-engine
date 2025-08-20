/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { EntityManager } from '@flowgram.ai/core'
import {
  FlowDocument,
  FlowDocumentContainerModule,
  FlowDocumentContribution,
  FlowNodeTransformData,
  FlowNodeTransitionData,
} from '@flowgram.ai/document'
import { Container, decorate, injectable, type interfaces } from 'inversify'

export class FlowDocumentMockRegister implements FlowDocumentContribution {
  registerDocument(document: FlowDocument) {
    document.registerNodeDatas(FlowNodeTransformData, FlowNodeTransitionData)
  }
}

decorate(injectable(), FlowDocumentMockRegister)

export function createDocumentContainer(): interfaces.Container {
  const container = new Container()
  container.load(FlowDocumentContainerModule)
  container.bind(EntityManager).toSelf()
  container.bind(FlowDocumentContribution).to(FlowDocumentMockRegister)
  return container
}

export function createDocument(): FlowDocument {
  return createDocumentContainer().get(FlowDocument)
}
