/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { NodeContext, Render } from '../node';

export interface NodeErrorRenderProps {
  error: Error;
  context: NodeContext;
}

export type NodeErrorRender = Render<NodeErrorRenderProps>;
