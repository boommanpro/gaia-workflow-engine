/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { injectable, inject } from 'inversify';

import { NodeManager } from './node-manager';
import { NodeEngineContext } from './node-engine-context';

@injectable()
export class NodeEngine {
  @inject(NodeManager) nodeManager: NodeManager;

  @inject(NodeEngineContext) context: NodeEngineContext;
}
