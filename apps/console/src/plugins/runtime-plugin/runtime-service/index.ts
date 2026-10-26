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
  WorkflowSelectService,
} from '@flowgram.ai/free-layout-editor';
import { FlowNodeFormData } from '@flowgram.ai/form-core';

import {
  backendIssuesToItems,
  formFeedbackToItem,
  itemText,
  messageToItem,
  type BackendIssue,
  type FormFeedbackLike,
  type TestRunErrorItem,
} from '../validation-errors';
import { WorkflowRuntimeClient } from '../client';
import { GetGlobalVariableSchema } from '../../variable-panel-plugin';
import { WorkflowNodeType } from '../../../nodes';

const SYNC_TASK_REPORT_INTERVAL = 500;
const MAX_HISTORY_SIZE = 50;

/** 编辑器试运行的工作流上下文（路由参数），随 TaskRun 上报供运行历史归档 */
export function setRunWorkflowContext(workflowCode: string | null): void {
  (window as any).WORKFLOW_RUN_CONTEXT = workflowCode ? { workflowCode } : null;
}

function getRunWorkflowCode(): string | undefined {
  return (window as any).WORKFLOW_RUN_CONTEXT?.workflowCode || undefined;
}

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

  @inject(WorkflowSelectService) selectService: WorkflowSelectService;

  @inject(GetGlobalVariableSchema) getGlobalVariableSchema: GetGlobalVariableSchema;

  private runningNodes: WorkflowNodeEntity[] = [];

  private taskID?: string;

  private syncTaskReportIntervalID?: ReturnType<typeof setInterval>;

  private reportEmitter = new Emitter<NodeReport>();

  private resetEmitter = new Emitter<{}>();

  private resultEmitter = new Emitter<{
    errors?: string[];
    /** 结构化错误（带 nodeId），面板渲染定位按钮、画布自动聚焦 */
    errorItems?: TestRunErrorItem[];
    /** 校验放行但应关注的告警（后端 warning 级） */
    warnings?: string[];
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
    if (!line.fromPort?.portID) {
      return true;
    }
    // 获取这条线的开始节点
    const fromNodeReport = this.nodeReports.get(line.from?.id || '');
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
    const formErrors = await this.validateForm();
    if (formErrors.length > 0) {
      this.fireValidationBlocked(formErrors, []);
      return;
    }
    const schema = {
      ...this.document.toJSON(),
      globalVariable: this.getGlobalVariableSchema(),
    };
    this.currentRunSchema = schema;

    // 后端在 errors 之外还返回结构化 issues（level/code/nodeId/message），
    // runtime-interface 的 TS 类型没声明，但线上 JSON 确实带——按扩展形状读取
    const validateResult = (await this.runtimeClient.TaskValidate({
      schema: JSON.stringify(schema),
      inputs,
    })) as
      | { valid: boolean; errors?: string[]; issues?: BackendIssue[]; warnings?: string[] }
      | undefined;
    if (!validateResult?.valid) {
      const titleOf = this.buildTitleLookup();
      const { errors } = backendIssuesToItems(validateResult?.issues, titleOf);
      const errorItems =
        errors.length > 0
          ? errors
          : (validateResult?.errors ?? ['Internal Server Error']).map(messageToItem);
      this.fireValidationBlocked(errorItems, validateResult?.warnings ?? []);
      return;
    }
    this.reset();
    let taskID: string | undefined;
    try {
      const output = (await this.runtimeClient.TaskRun({
        schema: JSON.stringify(schema),
        inputs,
        // 运行历史按工作流归档（B 项）：编辑器路由携带的编码随请求上报
        workflowCode: getRunWorkflowCode(),
      } as never)) as { taskID?: string; errors?: string[]; issues?: BackendIssue[] } | undefined;
      taskID = output?.taskID;
      // 后端运行前预检失败时回 { errors, issues }（无 taskID）——透出具体校验错误
      if (!taskID) {
        const titleOf = this.buildTitleLookup();
        const { errors } = backendIssuesToItems(output?.issues, titleOf);
        const errorItems =
          errors.length > 0 ? errors : (output?.errors ?? ['Task run failed']).map(messageToItem);
        this.fireValidationBlocked(errorItems, []);
        return;
      }
    } catch (e) {
      this.resultEmitter.fire({
        errors: [(e as Error)?.message],
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

  /**
   * 表单校验：返回带节点定位的明细，而不是把结果压成一个 boolean。
   * 表单模型必须从 FlowNodeFormData 取：node.form（NodeFormProps）没有
   * validateWithFeedbacks，那是 FormModel 的方法；拿错对象会让整个明细
   * 收集静默空转（已踩坑：拦截门失效，角标报错但试运行照常放行）。
   * validateWithFeedbacks 内部先跑 validate()（红框/行内错误/状态更新照常触发），
   * 再返回 {path, feedbackStatus, feedbackText} 明细。
   */
  private async validateForm(): Promise<TestRunErrorItem[]> {
    const nodes = this.document.getAllNodes();
    const titleOf = this.buildTitleLookup();
    const perNode = await Promise.all(
      nodes.map(async (node) => {
        let feedbacks: FormFeedbackLike[] = [];
        try {
          const formData = node.getData?.(FlowNodeFormData);
          const formModel = formData?.formModel;
          if (formData?.formModel?.initialized && formModel?.validateWithFeedbacks) {
            feedbacks = (await formModel.validateWithFeedbacks().catch(() => [])) ?? [];
          }
        } catch {
          return [];
        }
        const items: TestRunErrorItem[] = [];
        for (const feedback of feedbacks || []) {
          const item = formFeedbackToItem(node.id, titleOf(node.id), feedback);
          if (item) {
            items.push(item);
          }
        }
        return items;
      })
    );
    return perNode.flat();
  }

  /** 校验被拦下：面板展示可定位的错误列表，画布同时选中并滚到出错节点 */
  private fireValidationBlocked(items: TestRunErrorItem[], warnings: string[]): void {
    this.resultEmitter.fire({
      errors: items.map(itemText),
      errorItems: items,
      warnings: warnings.length > 0 ? warnings : undefined,
    });
    this.focusErrorNodes(items);
  }

  /** 选中所有出错节点并滚动到第一个，用户不用自己在画布上找红框 */
  private focusErrorNodes(items: TestRunErrorItem[]): void {
    const ids = [...new Set(items.map((item) => item.nodeId).filter(Boolean))] as string[];
    if (ids.length === 0) {
      return;
    }
    const entities = ids
      .map((id) => this.document.getNode(id))
      .filter((n): n is WorkflowNodeEntity => !!n);
    if (entities.length === 0) {
      return;
    }
    this.selectService.selection = entities;
    void this.playground.scrollToView({
      entities: [entities[0]],
      scrollToCenter: true,
      easing: true,
    });
  }

  /** 面板「定位」按钮：选中单个出错节点并滚动到中央 */
  public focusNode(nodeId: string): void {
    const entity = this.document.getNode(nodeId);
    if (!entity) {
      return;
    }
    this.selectService.selection = [entity];
    void this.playground.scrollToView({ entities: [entity], scrollToCenter: true, easing: true });
  }

  /** 一次性构建 nodeId → data.title 查询函数（toJSON 是整份序列化，别按错误条数重复调） */
  private buildTitleLookup(): (nodeId: string) => string | undefined {
    let cache: Map<string, string> | undefined;
    return (nodeId: string) => {
      if (!cache) {
        cache = new Map();
        try {
          const nodes =
            (this.document.toJSON() as { nodes?: { id?: string; data?: { title?: string } }[] })
              ?.nodes ?? [];
          for (const n of nodes) {
            if (n?.id) {
              cache.set(String(n.id), n?.data?.title || '');
            }
          }
        } catch {
          /* 忽略：标题缺失时回落展示裸 id */
        }
      }
      return cache.get(String(nodeId)) || undefined;
    };
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
      const hasOutputs = outputs && Object.keys(outputs).length > 0;
      const errorMessages = messages?.error?.filter((message) => message.message) ?? [];
      const titleOf = this.buildTitleLookup();
      const errorItems: TestRunErrorItem[] = errorMessages.map((message) => {
        const nodeId =
          message.nodeID && message.nodeID !== 'undefined' ? String(message.nodeID) : undefined;
        return {
          nodeId,
          nodeTitle: nodeId ? titleOf(nodeId) : undefined,
          message: message.message!,
        };
      });
      const errors = errorMessages.map((message) =>
        message.nodeID && message.nodeID !== 'undefined'
          ? `${message.nodeID}: ${message.message}`
          : message.message
      );
      if (hasOutputs) {
        const result = { inputs, outputs };
        this.resultEmitter.fire({
          result,
          errors: errors.length ? errors : undefined,
          errorItems: errorItems.length ? errorItems : undefined,
        });
        this.saveResult(result, report);
      } else if (errors.length > 0) {
        this.resultEmitter.fire({ errors, errorItems });
        this.saveError(errors);
        this.focusErrorNodes(errorItems);
      } else {
        // 运行成功但没有产出：明确提示去查 end 的引用，而不是伪装成 Unknown error
        const notes = [
          '工作流运行成功，但没有产出结果：请检查 end 节点的 inputsValues 是否引用了上游输出字段（ref 的 [节点id, 字段名] 必须真实存在）',
        ];
        this.resultEmitter.fire({ result: { inputs, outputs: outputs || {} }, errors: notes });
        this.saveResult({ inputs, outputs: outputs || {} }, report);
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
          if (Object.keys(reports).length > 0) {
            console.debug(
              '[runtime] report has no entry for node',
              nodeID,
              '— canvas ids may diverge from run schema'
            );
          }
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
