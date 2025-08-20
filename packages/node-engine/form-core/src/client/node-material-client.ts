/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { MATERIAL_KEY } from '../node/core-materials';
import { NodeManager, NodePlaceholderRender, Render } from '../node';

export function registerNodeErrorRender(nodeManager: NodeManager, render: Render): void {
  nodeManager.registerMaterialRender(MATERIAL_KEY.NODE_ERROR_RENDER, render);
}

export function registerNodePlaceholderRender(
  nodeManager: NodeManager,
  render: NodePlaceholderRender,
): void {
  nodeManager.registerMaterialRender(MATERIAL_KEY.NODE_PLACEHOLDER_RENDER, render);
}
