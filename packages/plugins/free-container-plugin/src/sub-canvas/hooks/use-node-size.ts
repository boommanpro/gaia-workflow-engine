/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { useState, useEffect } from 'react';

import {
  useCurrentEntity,
  WorkflowNodeMeta,
  WorkflowNodePortsData,
} from '@flowgram.ai/free-layout-core';
import { FlowNodeTransformData } from '@flowgram.ai/document';

export interface NodeSize {
  width: number;
  height: number;
}

export const useNodeSize = (): NodeSize | undefined => {
  const node = useCurrentEntity();
  const nodeMeta = node.getNodeMeta<WorkflowNodeMeta>();
  const { size = { width: 300, height: 200 }, isContainer } = nodeMeta;

  const transform = node.getData<FlowNodeTransformData>(FlowNodeTransformData);
  const [width, setWidth] = useState(size.width);
  const [height, setHeight] = useState(size.height);

  const updatePorts = () => {
    const portsData = node.getData<WorkflowNodePortsData>(WorkflowNodePortsData);
    portsData.updateDynamicPorts();
  };

  const updateSize = () => {
    // 无子节点时
    if (node.blocks.length === 0) {
      setWidth(size.width);
      setHeight(size.height);
      return;
    }
    // 存在子节点时，只监听宽高变化
    setWidth(transform.bounds.width);
    setHeight(transform.bounds.height);
  };

  useEffect(() => {
    const dispose = transform.onDataChange(() => {
      updateSize();
      updatePorts();
    });
    return () => dispose.dispose();
  }, [transform, width, height]);

  useEffect(() => {
    // 初始化触发一次
    updateSize();
  }, []);

  if (!isContainer) {
    return;
  }

  return {
    width,
    height,
  };
};
