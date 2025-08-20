/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { ToolNodeRegistry } from './tool';
import { MemoryNodeRegistry } from './memory';
import { AgentToolsNodeRegistry } from './agent-tools';
import { AgentMemoryNodeRegistry } from './agent-memory';
import { AgentLLMNodeRegistry } from './agent-llm';
import { AgentNodeRegistry } from './agent';

export const AgentNodeRegistries = [
  AgentNodeRegistry,
  AgentMemoryNodeRegistry,
  AgentToolsNodeRegistry,
  AgentLLMNodeRegistry,
  MemoryNodeRegistry,
  ToolNodeRegistry,
];
