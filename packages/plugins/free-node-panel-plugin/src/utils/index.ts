/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { IWaitNodeRender, waitNodeRender } from './wait-node-render';
import {
  updateSubSequentNodesPosition,
  IUpdateSubSequentNodesPosition,
} from './update-sub-nodes-position';
import { subPositionOffset, ISubPositionOffset } from './sub-position-offset';
import { subNodesAutoOffset, ISubNodesAutoOffset } from './sub-nodes-auto-offset';
import { rectDistance, IRectDistance } from './rect-distance';
import { getSubsequentNodes, IGetSubsequentNodes } from './get-sub-nodes';
import { getPortBox, IGetPortBox } from './get-port-box';
import { getContainerNode, IGetContainerNode } from './get-container-node';
import { buildLine, IBuildLine } from './build-line';
import { adjustNodePosition, IAdjustNodePosition } from './adjust-node-position';

export interface IWorkflowNodePanelUtils {
  adjustNodePosition: IAdjustNodePosition;
  buildLine: IBuildLine;
  getPortBox: IGetPortBox;
  getSubsequentNodes: IGetSubsequentNodes;
  getContainerNode: IGetContainerNode;
  rectDistance: IRectDistance;
  subNodesAutoOffset: ISubNodesAutoOffset;
  subPositionOffset: ISubPositionOffset;
  updateSubSequentNodesPosition: IUpdateSubSequentNodesPosition;
  waitNodeRender: IWaitNodeRender;
}

export const WorkflowNodePanelUtils: IWorkflowNodePanelUtils = {
  adjustNodePosition,
  buildLine,
  getPortBox,
  getSubsequentNodes,
  getContainerNode,
  rectDistance,
  subNodesAutoOffset,
  subPositionOffset,
  updateSubSequentNodesPosition,
  waitNodeRender,
};
