/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import React from 'react';

import { FlowNodeEntity } from '@flowgram.ai/document';

import { NodeFormContext } from '../form';

/**
 * @deprecated
 * use `NodeFormContext` instead
 */
export type NodeContext = NodeFormContext;

export type Render<T = any> = (props: T) => any;

export type NodePluginRender = Render<NodeFormContext>;

export type NodePlaceholderRender = Render<NodeFormContext>;

export interface NodeRenderProps {
  node: FlowNodeEntity;
}

export type NodeRenderHoc = (
  Component: React.JSXElementConstructor<NodeRenderProps>
) => React.JSXElementConstructor<NodeRenderProps>;
