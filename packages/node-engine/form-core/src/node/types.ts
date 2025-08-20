import React from 'react';

import { FlowNodeEntity } from '@flowgram.ai/document';
import { PlaygroundContext, PluginContext } from '@flowgram.ai/core';

export interface NodeContext {
  node: FlowNodeEntity;
  playgroundContext: PlaygroundContext;
  clientContext: PluginContext & Record<string, any>;
}

export type Render<T = any> = (props: T) => any;

export type NodePluginRender = Render<NodeContext>;

export type NodePlaceholderRender = Render<NodeContext>;

export interface NodeRenderProps {
  node: FlowNodeEntity;
}

export type NodeRenderHoc = (
  Component: React.JSXElementConstructor<NodeRenderProps>
) => React.JSXElementConstructor<NodeRenderProps>;
