import type { IFlowConstantRefValue } from './value';
import type { WorkflowNodeMetaSchema } from './node-meta';
import { IJsonSchema } from './json-schema';
import type { WorkflowEdgeSchema } from './edge';

export interface WorkflowNodeSchema<T = string, D = any> {
  id: string;
  type: T;
  meta: WorkflowNodeMetaSchema;
  data: D & {
    title?: string;
    inputsValues?: Record<string, IFlowConstantRefValue>;
    inputs?: IJsonSchema;
    outputs?: IJsonSchema;
    [key: string]: any;
  };
  blocks?: WorkflowNodeSchema[];
  edges?: WorkflowEdgeSchema[];
}
