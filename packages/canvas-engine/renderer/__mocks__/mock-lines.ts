/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { FlowTransitionLineEnum } from "@flowgram.ai/document"

export const mockDivergeLine1 = {
  type: FlowTransitionLineEnum.DIVERGE_LINE,
  from: {x: 140, y: 212},
  to: {x: 0, y: 235},
}

export const mockDivergeLine2 = {
  type: FlowTransitionLineEnum.DIVERGE_LINE,
  from: {x: 140, y: 212},
  to: {x: 156, y: 232},
}

export const mockDivergeLine3 = {
  type: FlowTransitionLineEnum.DIVERGE_LINE,
  from: {x: 140, y: 212},
  to: {x: 141, y: 332},
}

export const mockMergeLine3 = {
  type: FlowTransitionLineEnum.MERGE_LINE,
  from: {x: 140, y: 212},
  to: {x: 0, y: 235},
}

export const mockMergeLine4 = {
  type: FlowTransitionLineEnum.MERGE_LINE,
  from: {x: 140, y: 212},
  to: {x: 141, y: 335},
}

export const mockMergeLine5 = {
  type: FlowTransitionLineEnum.MERGE_LINE,
  from: {x: 140, y: 212},
  to: {x: 150, y: 335},
}

export const noRadiusLine = {
  type: FlowTransitionLineEnum.DIVERGE_LINE,
  from: {x: 140, y: 212},
  to: {x: 141, y: 213},
}

export const noTypeLine = {
  type: undefined,
  from: {x: 140, y: 212},
  to: {x: 0, y: 312},
}
