/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import {
  WorkflowLinesManager,
  WorkflowNodeEntity,
  WorkflowNodePortsData,
  WorkflowPortEntity,
} from '@flowgram.ai/free-layout-core';

export type IBuildLine = (params: {
  node: WorkflowNodeEntity;
  linesManager: WorkflowLinesManager;
  fromPort?: WorkflowPortEntity;
  toPort?: WorkflowPortEntity;
}) => void;

/** 建立连线 */
export const buildLine: IBuildLine = (params) => {
  const { fromPort, node, toPort, linesManager } = params;
  const portsData = node.getData(WorkflowNodePortsData);
  if (!portsData) {
    return;
  }

  const shouldBuildFromLine = portsData.inputPorts?.length > 0;
  if (fromPort && shouldBuildFromLine) {
    const isVertical = fromPort.location === 'bottom';
    const toTargetPort =
      portsData.inputPorts.find((port) => (isVertical ? port.location === 'top' : true)) ||
      portsData.inputPorts[0];
    linesManager.createLine({
      from: fromPort.node.id,
      fromPort: fromPort.portID,
      to: node.id,
      toPort: toTargetPort.portID,
    });
  }
  const shouldBuildToLine = portsData.outputPorts?.length > 0;
  if (toPort && shouldBuildToLine) {
    const fromTargetPort = portsData.outputPorts[0];
    linesManager.createLine({
      from: node.id,
      fromPort: fromTargetPort.portID,
      to: toPort.node.id,
      toPort: toPort.portID,
    });
  }
};
