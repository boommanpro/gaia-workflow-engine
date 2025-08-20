/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { WorkflowNodeSchema } from '@schema/node';
import { FlowGramNode } from '@node/constant';

interface ContinueNodeData {}

export type ContinueNodeSchema = WorkflowNodeSchema<FlowGramNode.Continue, ContinueNodeData>;
