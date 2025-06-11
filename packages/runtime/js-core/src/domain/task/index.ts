import {
  IContext,
  ITask,
  TaskParams,
  WorkflowOutputs,
  WorkflowStatus,
} from '@flowgram.ai/runtime-interface';

import { uuid } from '@infra/utils';

export class WorkflowRuntimeTask implements ITask {
  public readonly id: string;

  public readonly processing: Promise<WorkflowOutputs>;

  public readonly context: IContext;

  constructor(params: TaskParams) {
    this.id = uuid();
    this.context = params.context;
    this.processing = params.processing;
  }

  public cancel(): void {
    this.context.statusCenter.workflow.cancel();
    const cancelNodeIDs = this.context.statusCenter.getStatusNodeIDs(WorkflowStatus.Processing);
    cancelNodeIDs.forEach((nodeID) => {
      this.context.statusCenter.nodeStatus(nodeID).cancel();
    });
  }

  public static create(params: TaskParams): WorkflowRuntimeTask {
    return new WorkflowRuntimeTask(params);
  }
}
