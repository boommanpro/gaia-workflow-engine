import {
  IReport,
  NodeReport,
  WorkflowInputs,
  WorkflowOutputs,
  WorkflowStatus,
} from '@flowgram.ai/runtime-interface';
import {
  injectable,
  inject,
  WorkflowDocument,
  Playground,
  WorkflowLineEntity,
  WorkflowNodeEntity,
  WorkflowNodeLinesData,
  Emitter,
  getNodeForm,
} from '@flowgram.ai/free-layout-editor';

import { WorkflowRuntimeClient } from '../browser-client';

const SYNC_TASK_REPORT_INTERVAL = 500;

interface NodeRunningStatus {
  nodeID: string;
  status: WorkflowStatus;
  nodeResultLength: number;
}

@injectable()
export class WorkflowRuntimeService {
  @inject(Playground) playground: Playground;

  @inject(WorkflowDocument) document: WorkflowDocument;

  @inject(WorkflowRuntimeClient) runtimeClient: WorkflowRuntimeClient;

  private runningNodes: WorkflowNodeEntity[] = [];

  private taskID?: string;

  private syncTaskReportIntervalID?: ReturnType<typeof setInterval>;

  private reportEmitter = new Emitter<NodeReport>();

  private resetEmitter = new Emitter<{}>();

  public terminatedEmitter = new Emitter<{
    result?: {
      inputs: WorkflowInputs;
      outputs: WorkflowOutputs;
    };
  }>();

  private nodeRunningStatus: Map<string, NodeRunningStatus>;

  public onNodeReportChange = this.reportEmitter.event;

  public onReset = this.resetEmitter.event;

  public onTerminated = this.terminatedEmitter.event;

  public isFlowingLine(line: WorkflowLineEntity) {
    return this.runningNodes.some((node) =>
      node.getData(WorkflowNodeLinesData).inputLines.includes(line)
    );
  }

  public async taskRun(inputsString: string): Promise<void> {
    if (this.taskID) {
      await this.taskCancel();
    }
    if (!this.validate()) {
      return;
    }
    this.reset();
    const output = await this.runtimeClient.TaskRun({
      schema: JSON.stringify(this.document.toJSON()),
      inputs: JSON.parse(inputsString) as WorkflowInputs,
    });
    if (!output) {
      this.terminatedEmitter.fire({});
      return;
    }
    this.taskID = output.taskID;
    this.syncTaskReportIntervalID = setInterval(() => {
      this.syncTaskReport();
    }, SYNC_TASK_REPORT_INTERVAL);
  }

  public async taskCancel(): Promise<void> {
    if (!this.taskID) {
      return;
    }
    await this.runtimeClient.TaskCancel({
      taskID: this.taskID,
    });
  }

  private async validate(): Promise<boolean> {
    const allForms = this.document.getAllNodes().map((node) => getNodeForm(node));
    const formValidations = await Promise.all(allForms.map(async (form) => form?.validate()));
    const validations = formValidations.filter((validation) => validation !== undefined);
    const isValid = validations.every((validation) => validation);
    return isValid;
  }

  private reset(): void {
    this.taskID = undefined;
    this.nodeRunningStatus = new Map();
    this.runningNodes = [];
    if (this.syncTaskReportIntervalID) {
      clearInterval(this.syncTaskReportIntervalID);
    }
    this.resetEmitter.fire({});
  }

  private async syncTaskReport(): Promise<void> {
    if (!this.taskID) {
      return;
    }
    const output = await this.runtimeClient.TaskReport({
      taskID: this.taskID,
    });
    if (!output) {
      clearInterval(this.syncTaskReportIntervalID);
      console.error('Sync task report failed');
      return;
    }
    const { workflowStatus, inputs, outputs } = output;
    if (workflowStatus.terminated) {
      clearInterval(this.syncTaskReportIntervalID);
      if (Object.keys(outputs).length > 0) {
        this.terminatedEmitter.fire({ result: { inputs, outputs } });
      } else {
        this.terminatedEmitter.fire({});
      }
    }
    this.updateReport(output);
  }

  private updateReport(report: IReport): void {
    const { reports } = report;
    this.runningNodes = [];
    this.document.getAllNodes().forEach((node) => {
      const nodeID = node.id;
      const nodeReport = reports[nodeID];
      if (!nodeReport) {
        return;
      }
      if (nodeReport.status === WorkflowStatus.Processing) {
        this.runningNodes.push(node);
      }
      const runningStatus = this.nodeRunningStatus.get(nodeID);
      if (
        !runningStatus ||
        nodeReport.status !== runningStatus.status ||
        nodeReport.snapshots.length !== runningStatus.nodeResultLength
      ) {
        this.nodeRunningStatus.set(nodeID, {
          nodeID,
          status: nodeReport.status,
          nodeResultLength: nodeReport.snapshots.length,
        });
        this.reportEmitter.fire(nodeReport);
        this.document.linesManager.forceUpdate();
      } else if (nodeReport.status === WorkflowStatus.Processing) {
        this.reportEmitter.fire(nodeReport);
      }
    });
  }
}
