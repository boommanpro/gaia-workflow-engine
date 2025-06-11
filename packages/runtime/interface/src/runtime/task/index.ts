import { IContext } from '../context';
import { WorkflowOutputs } from '../base';

export interface ITask {
  id: string;
  processing: Promise<WorkflowOutputs>;
  context: IContext;
  cancel(): void;
}

export interface TaskParams {
  processing: Promise<WorkflowOutputs>;
  context: IContext;
}
