/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { injectable } from 'inversify';

import { NodeContribution } from '../node';
import { NodeManager, PLUGIN_KEY } from '../node';
import { errorPluginRender } from './renders';

@injectable()
export class ErrorNodeContribution implements NodeContribution {
  onRegister(nodeManager: NodeManager) {
    nodeManager.registerPluginRender(PLUGIN_KEY.ERROR, errorPluginRender);
  }
}
