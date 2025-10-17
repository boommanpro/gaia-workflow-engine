/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { mean } from 'lodash-es';
import { FlowNodeTransformData } from '@flowgram.ai/document';

export const getDisplayFirstChildTop = (transform: FlowNodeTransformData): number => {
  if (transform.firstChild) {
    return transform.localBounds.top + getDisplayFirstChildTop(transform.firstChild);
  }

  return transform.localBounds.center.y;
};

/**
 * 获取单个 Port 的中间点
 * @param inlineBlocks
 * @returns
 */
export const getPortMiddle = (_port: FlowNodeTransformData) => {
  if (!_port.children.length) {
    return _port.localBounds.top;
  }

  const portChildInputs = [_port.firstChild!, _port.lastChild!].map((_portChild) =>
    getDisplayFirstChildTop(_portChild)
  );

  return _port.localBounds.top + mean(portChildInputs);
};

/**
 * 获取所有 Port 的中间点
 * @param inlineBlocks
 * @returns
 */
export const getAllPortsMiddle = (inlineBlocks: FlowNodeTransformData) => {
  if (!inlineBlocks.children.length) {
    return inlineBlocks.localBounds.height / 2;
  }

  const portInputs = [inlineBlocks.firstChild!, inlineBlocks.lastChild!].map((_port) =>
    getPortMiddle(_port)
  );

  return mean(portInputs);
};
