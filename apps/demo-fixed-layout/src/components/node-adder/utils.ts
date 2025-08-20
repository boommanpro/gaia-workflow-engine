/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { nanoid } from 'nanoid';
import { FlowNodeEntity } from '@flowgram.ai/fixed-layout-editor';

export const generateNodeId = (n: FlowNodeEntity) => `${n.type || n.flowNodeType}_${nanoid()}`;
