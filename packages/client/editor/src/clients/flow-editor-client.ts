/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { injectable, inject } from 'inversify';
import { type FormItem } from '@flowgram.ai/form-core';
import { FlowNodeEntity } from '@flowgram.ai/document';
import { Playground, PlaygroundConfigRevealOpts } from '@flowgram.ai/core';

import { FocusNodeFormItemOptions, NodeClient } from './node-client';

interface FocusNodeOptions {
  zoom?: PlaygroundConfigRevealOpts['zoom'];
  easing?: PlaygroundConfigRevealOpts['easing']; // 是否开启缓动，默认开启
  easingDuration?: PlaygroundConfigRevealOpts['easingDuration']; // 默认 500 ms
  scrollToCenter?: PlaygroundConfigRevealOpts['scrollToCenter']; // 是否滚动到中心
}

@injectable()
export class FlowEditorClient {
  @inject(NodeClient) readonly nodeClient: NodeClient;

  @inject(Playground) readonly playground: Playground;

  focusNodeFormItem(formItem: FormItem, options?: FocusNodeFormItemOptions) {
    this.nodeClient.nodeFocusService.focusNodeFormItem(formItem, options);
  }

  focusNode(node: FlowNodeEntity, options?: FocusNodeOptions) {
    this.playground.scrollToView({ entities: [node], ...options });
  }
}
