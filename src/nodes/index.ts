import { FlowNodeRegistry } from '../typings';
import { StartNodeRegistry } from './start';
import { NoteNodeRegistry } from './note';
import { LoopNodeRegistry } from './loop';
import { LLMNodeRegistry } from './llm';
import { FllConditionNodeRegistry } from './full-condition';
import { EndNodeRegistry } from './end';
import { WorkflowNodeType } from './constants';
import { ConditionNodeRegistry } from './condition';
import { CommentNodeRegistry } from './comment';
import { CodeNodeRegistry } from './code';
export { WorkflowNodeType } from './constants';

export const nodeRegistries: FlowNodeRegistry[] = [
  FllConditionNodeRegistry,
  StartNodeRegistry,
  EndNodeRegistry,
  LLMNodeRegistry,
  CodeNodeRegistry,
  LoopNodeRegistry,
  CommentNodeRegistry,
  NoteNodeRegistry,
];

export const visibleNodeRegistries = nodeRegistries.filter((r) => !r.canAdd);
