/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import {
  IReport,
  NodeReport,
  WorkflowInputs,
  WorkflowOutputs,
  WorkflowStatus,
} from '@flowgram.ai/runtime-interface';
import {
  Emitter,
  inject,
  injectable,
  Playground,
  WorkflowDocument,
  WorkflowLineEntity,
  WorkflowNodeEntity,
} from '@flowgram.ai/free-layout-editor';

import { WorkflowRuntimeClient } from '../client';
import { GetGlobalVariableSchema } from '../../variable-panel-plugin';
import { WorkflowNodeType } from '../../../nodes';

const SYNC_TASK_REPORT_INTERVAL = 500;
const MAX_HISTORY_SIZE = 50;

interface NodeRunningStatus {
  nodeID: string;
  status: WorkflowStatus;
  nodeResultLength: number;
}

export interface TestRunRecord {
  id: string;
  timestamp: number;
  status: 'success' | 'error' | 'running';
  schema: Record<string, unknown>;
  inputs: WorkflowInputs;
  outputs: WorkflowOutputs;
  report?: IReport;
  errors?: string[];
}

@injectable()
export class WorkflowRuntimeService {
  @inject(Playground) playground: Playground;

  @inject(WorkflowDocument) document: WorkflowDocument;

  @inject(WorkflowRuntimeClient) runtimeClient: WorkflowRuntimeClient;

  @inject(GetGlobalVariableSchema) getGlobalVariableSchema: GetGlobalVariableSchema;

  private runningNodes: WorkflowNodeEntity[] = [];

  private taskID?: string;

  private syncTaskReportIntervalID?: ReturnType<typeof setInterval>;

  private reportEmitter = new Emitter<NodeReport>();

  private resetEmitter = new Emitter<{}>();

  private resultEmitter = new Emitter<{
    errors?: string[];
    result?: {
      inputs: WorkflowInputs;
      outputs: WorkflowOutputs;
    };
  }>();

  private nodeRunningStatus: Map<string, NodeRunningStatus> = new Map();

  private nodeReports: Map<string, NodeReport> = new Map();

  private lastResult?: { inputs: WorkflowInputs; outputs: WorkflowOutputs };

  private lastError?: string[];

  private lastReport?: IReport;

  private currentReport?: IReport;

  private currentRunSchema?: Record<string, unknown>;

  private testRunHistory: TestRunRecord[] = [];

  private historyEmitter = new Emitter<TestRunRecord[]>();

  public onHistoryChanged = this.historyEmitter.event;

  public getHistory(): TestRunRecord[] {
    return [...this.testRunHistory];
  }

  private saveToHistory(
    status: 'success' | 'error',
    schema: Record<string, unknown>,
    inputs: WorkflowInputs,
    outputs: WorkflowOutputs,
    report?: IReport,
    errors?: string[]
  ): void {
    const record: TestRunRecord = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      status,
      schema,
      inputs,
      outputs,
      report,
      errors,
    };

    this.testRunHistory.unshift(record);

    if (this.testRunHistory.length > MAX_HISTORY_SIZE) {
      this.testRunHistory = this.testRunHistory.slice(0, MAX_HISTORY_SIZE);
    }

    this.historyEmitter.fire([...this.testRunHistory]);
  }

  public clearHistory(): void {
    this.testRunHistory = [];
    this.historyEmitter.fire([]);
  }

  public onNodeReportChange = this.reportEmitter.event;

  public onReset = this.resetEmitter.event;

  public onResultChanged = this.resultEmitter.event;

  public isFlowingLine(line: WorkflowLineEntity) {
    // 首先检查这条线是否是运行节点的输入线
    const isInputLine = this.runningNodes.some((node) => node.lines.inputLines.includes(line));
    if (!isInputLine) {
      return false;
    }
    if (!line.fromPort.portID) {
      return true;
    }
    // 获取这条线的开始节点
    const fromNodeReport = this.nodeReports.get(line.from.id);
    if (!fromNodeReport || !fromNodeReport.snapshots.length) {
      return false;
    }

    // 检查开始节点最后一个snapshot中的branch是否为null或与fromPort相等
    const latestSnapshot = fromNodeReport.snapshots[fromNodeReport.snapshots.length - 1];
    const executedBranch = latestSnapshot.branch;

    return !executedBranch || line.info.fromPort === executedBranch;
  }

  public async taskRun(
    inputs: WorkflowInputs,
    cancelExisting: boolean = false
  ): Promise<string | undefined> {
    if (cancelExisting && this.taskID) {
      await this.taskCancel();
    }
    const isFormValid = await this.validateForm();
    if (!isFormValid) {
      this.resultEmitter.fire({
        errors: ['Form validation failed'],
      });
      return;
    }
    const schema = {
      ...this.document.toJSON(),
      globalVariable: this.getGlobalVariableSchema(),
    };
    this.currentRunSchema = schema;

    const validateResult = await this.runtimeClient.TaskValidate({
      schema: JSON.stringify(schema),
      inputs,
    });
    if (!validateResult?.valid) {
      this.resultEmitter.fire({
        errors: validateResult?.errors ?? ['Internal Server Error'],
      });
      return;
    }
    this.reset();
    let taskID: string | undefined;
    try {
      const output = await this.runtimeClient.TaskRun({
        schema: JSON.stringify(schema),
        inputs,
      });
      taskID = output?.taskID;
    } catch (e) {
      this.resultEmitter.fire({
        errors: [(e as Error)?.message],
      });
      return;
    }
    if (!taskID) {
      this.resultEmitter.fire({
        errors: ['Task run failed'],
      });
      return;
    }
    this.taskID = taskID;
    this.syncTaskReportIntervalID = setInterval(() => {
      this.syncTaskReport();
    }, SYNC_TASK_REPORT_INTERVAL);
    return this.taskID;
  }

  public async taskCancel(): Promise<void> {
    if (!this.taskID) {
      return;
    }
    await this.runtimeClient.TaskCancel({
      taskID: this.taskID,
    });
  }

  private async validateForm(): Promise<boolean> {
    const allForms = this.document.getAllNodes().map((node) => node.form);
    const formValidations = await Promise.all(allForms.map(async (form) => form?.validate()));
    const validations = formValidations.filter((validation) => validation !== undefined);
    const isValid = validations.every((validation) => validation);
    return isValid;
  }

  public reset(): void {
    this.taskID = undefined;
    this.nodeRunningStatus = new Map();
    this.nodeReports.clear();
    this.runningNodes = [];
    this.lastReport = undefined;
    if (this.syncTaskReportIntervalID) {
      clearInterval(this.syncTaskReportIntervalID);
    }
    this.resetEmitter.fire({});
  }

  private async syncTaskReport(): Promise<void> {
    if (!this.taskID) {
      return;
    }
    const report = await this.runtimeClient.TaskReport({
      taskID: this.taskID,
    });
    if (!report) {
      clearInterval(this.syncTaskReportIntervalID);
      console.error('Sync task report failed');
      return;
    }
    const { workflowStatus, inputs, outputs, messages } = report;
    if (workflowStatus.terminated) {
      clearInterval(this.syncTaskReportIntervalID);
      this.taskID = undefined;
      if (outputs && Object.keys(outputs).length > 0) {
        const result = { inputs, outputs };
        this.resultEmitter.fire({ result });
        this.saveResult(result, report);
      } else {
        const errors = messages?.error?.map((message) =>
          message.nodeID ? `${message.nodeID}: ${message.message}` : message.message
        );
        this.resultEmitter.fire({ errors });
        this.saveError(errors || ['Unknown error']);
      }
    }
    this.updateReport(report);
  }

  public updateReport(report: IReport): void {
    this.lastReport = report;
    this.currentReport = report;
    const { reports } = report;
    this.runningNodes = [];
    this.nodeRunningStatus = new Map();
    this.nodeReports.clear();
    const processedNodeIds = new Set<string>();

    this.document
      .getAllNodes()
      .filter(
        (node) =>
          ![WorkflowNodeType.BlockStart, WorkflowNodeType.BlockEnd].includes(
            node.flowNodeType as WorkflowNodeType
          )
      )
      .forEach((node) => {
        const nodeID = node.id;
        const nodeReport = reports[nodeID];
        if (!nodeReport) {
          return;
        }

        // 更新 nodeReports Map
        this.nodeReports.set(nodeID, nodeReport);

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

  // 添加设置认证信息的方法
  public setAuthorization(auth: string | null) {
    // 这里可以添加更多处理逻辑，如果需要的话
    console.log('Setting authorization for runtime service:', auth);
  }

  public isTaskRunning(): boolean {
    return !!this.taskID;
  }

  public getTaskID(): string | undefined {
    return this.taskID;
  }

  public getLastResult(): { inputs: WorkflowInputs; outputs: WorkflowOutputs } | undefined {
    return this.lastResult;
  }

  public getLastReport(): IReport | undefined {
    return this.lastReport;
  }

  public getCurrentReport(): IReport | undefined {
    return this.currentReport;
  }

  public getLastError(): string[] | undefined {
    return this.lastError;
  }

  public saveResult(
    result: { inputs: WorkflowInputs; outputs: WorkflowOutputs },
    report?: IReport
  ): void {
    this.lastResult = result;
    this.lastReport = report;
    this.lastError = undefined;

    if (this.currentRunSchema) {
      this.saveToHistory('success', this.currentRunSchema, result.inputs, result.outputs, report);
      this.currentRunSchema = undefined;
    }
  }

  public saveError(errors: string[]): void {
    this.lastError = errors;
    this.lastResult = undefined;

    if (this.currentRunSchema) {
      this.saveToHistory('error', this.currentRunSchema, {}, {}, undefined, errors);
      this.currentRunSchema = undefined;
    }
  }

  public clearResult(): void {
    this.lastResult = undefined;
    this.lastError = undefined;
  }
}
