import type { WorkflowNodeSchema } from './node';
import type { WorkflowEdgeSchema } from './edge';

export interface WorkflowSchema {
  nodes: WorkflowNodeSchema[];
  edges: WorkflowEdgeSchema[];
}
