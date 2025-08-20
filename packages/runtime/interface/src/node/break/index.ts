/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { WorkflowNodeSchema } from '@schema/node';
import { FlowGramNode } from '@node/constant';

interface BreakNodeData {}

export type BreakNodeSchema = WorkflowNodeSchema<FlowGramNode.Break, BreakNodeData>;
