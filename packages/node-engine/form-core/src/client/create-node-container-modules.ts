/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { NodeContainerModule } from '../node/node-container-module';
import { FormCoreContainerModule } from '../form';
import { ErrorContainerModule } from '../error';

export function createNodeContainerModules() {
  return [NodeContainerModule, FormCoreContainerModule, ErrorContainerModule];
}
