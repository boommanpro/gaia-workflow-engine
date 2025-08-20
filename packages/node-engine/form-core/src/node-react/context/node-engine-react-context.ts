/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import React from 'react';

import { INodeEngineContext, NodeEngineContext } from '../../node';

export const NodeEngineReactContext = React.createContext<INodeEngineContext>(
  NodeEngineContext.DEFAULT_JSON,
);
