import { IFlowConstantRefValue } from '@schema/value';
import { WorkflowNodeSchema } from '@schema/node';
import { IJsonSchema } from '@schema/json-schema';
import { FlowGramNode } from '@node/constant';

interface EndNodeData {
  title: string;
  inputs: IJsonSchema<'object'>;
  outputs: IJsonSchema<'object'>;
  outputValues: Record<string, IFlowConstantRefValue>;
}

export type EndNodeSchema = WorkflowNodeSchema<FlowGramNode.End, EndNodeData>;
