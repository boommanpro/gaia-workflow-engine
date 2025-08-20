/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { injectable, inject } from 'inversify';

import { NodeFocusService } from './node-focus-service';

@injectable()
export class NodeClient {
  @inject(NodeFocusService) nodeFocusService: NodeFocusService;
}
