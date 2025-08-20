/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { ContainerModule } from 'inversify';

import { FlowOperationBaseService } from './typings/flow-operation';
import { FlowDragService } from './services/flow-drag-service';
import { FlowGroupService, FlowOperationBaseServiceImpl } from './services';
import { HorizontalFixedLayout, VerticalFixedLayout } from './layout';
import { FlowDocumentContribution } from './flow-document-contribution';
import { FlowDocumentConfig } from './flow-document-config';
import { FlowDocument, FlowDocumentProvider } from './flow-document';

export const FlowDocumentContainerModule = new ContainerModule((bind) => {
  bind(FlowDocument).toSelf().inSingletonScope();
  bind(FlowDocumentProvider)
    .toDynamicValue((ctx) => () => ctx.container.get(FlowDocument))
    .inSingletonScope();
  bind(FlowDocumentConfig).toSelf().inSingletonScope();
  bind(VerticalFixedLayout).toSelf().inSingletonScope();
  bind(HorizontalFixedLayout).toSelf().inSingletonScope();
  bind(FlowDragService).toSelf().inSingletonScope();
  bind(FlowOperationBaseService).to(FlowOperationBaseServiceImpl).inSingletonScope();
  bind(FlowGroupService).toSelf().inSingletonScope();
  bind(FlowDocumentContribution).toDynamicValue((ctx) => ({
    registerDocument: (document: FlowDocument) => {
      document.registerLayout(ctx.container.get(VerticalFixedLayout));
      document.registerLayout(ctx.container.get(HorizontalFixedLayout));
    },
  }));
});
