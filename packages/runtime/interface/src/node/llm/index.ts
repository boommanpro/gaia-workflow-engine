import { IFlowConstantRefValue } from '@schema/value';
import { WorkflowNodeSchema } from '@schema/node';
import { IJsonSchema } from '@schema/json-schema';
import { FlowGramNode } from '@node/constant';

interface LLMNodeData {
  title: string;
  inputs: IJsonSchema<'object'>;
  outputs: IJsonSchema<'object'>;
  inputValues: {
    apiKey: IFlowConstantRefValue;
    modelType: IFlowConstantRefValue;
    baseURL: IFlowConstantRefValue;
    temperature: IFlowConstantRefValue;
    systemPrompt: IFlowConstantRefValue;
    prompt: IFlowConstantRefValue;
  };
}

export type LLMNodeSchema = WorkflowNodeSchema<FlowGramNode.LLM, LLMNodeData>;
