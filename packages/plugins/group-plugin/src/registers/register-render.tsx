/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import React, { FC } from 'react';

import { FlowRendererRegistry } from '@flowgram.ai/renderer';
import { FlowNodeEntity } from '@flowgram.ai/document';

import { IGroupPluginRegister } from '../type';
import { GroupRenderer } from '../constant';
import { GroupRender } from '../components';

/** 注册渲染组件 */
export const registerRender: IGroupPluginRegister = (ctx, opts) => {
  const rendererRegistry = ctx.get<FlowRendererRegistry>(FlowRendererRegistry);
  const renderer: FC<{ node: FlowNodeEntity }> = props => (
    <GroupRender
      groupNode={props.node}
      GroupNode={opts.components!.GroupNode}
      GroupBoxHeader={opts.components!.GroupBoxHeader}
    />
  );
  rendererRegistry.registerReactComponent(GroupRenderer.GroupRender, renderer);
};
