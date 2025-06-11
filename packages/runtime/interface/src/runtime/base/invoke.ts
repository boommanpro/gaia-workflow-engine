import { WorkflowSchema } from '@schema/index';
import { WorkflowInputs } from './inputs-outputs';

export interface InvokeParams {
  schema: WorkflowSchema;
  inputs: WorkflowInputs;
}

export type WorkflowRuntimeInvoke = (params: InvokeParams) => Promise<WorkflowInputs>;
