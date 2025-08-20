/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import React from 'react';

export const PlaygroundReactContext = React.createContext<any>({});

export const PlaygroundReactContainerContext = React.createContext<any>({});

export const PlaygroundReactRefContext = React.createContext<any>({});

/**
 * 当前 entity
 */
export const PlaygroundEntityContext = React.createContext<any>(undefined);
