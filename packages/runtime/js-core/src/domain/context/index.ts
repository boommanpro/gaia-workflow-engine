import {
  InvokeParams,
  IContext,
  IDocument,
  IState,
  ISnapshotCenter,
  IVariableStore,
  IStatusCenter,
  IReporter,
  IIOCenter,
  ContextData,
} from '@flowgram.ai/runtime-interface';

import { uuid } from '@infra/utils';
import { WorkflowRuntimeVariableStore } from '../variable';
import { WorkflowRuntimeStatusCenter } from '../status';
import { WorkflowRuntimeState } from '../state';
import { WorkflowRuntimeSnapshotCenter } from '../snapshot';
import { WorkflowRuntimeReporter } from '../report';
import { WorkflowRuntimeIOCenter } from '../io-center';
import { WorkflowRuntimeDocument } from '../document';

export class WorkflowRuntimeContext implements IContext {
  public readonly id: string;

  public readonly document: IDocument;

  public readonly variableStore: IVariableStore;

  public readonly state: IState;

  public readonly ioCenter: IIOCenter;

  public readonly snapshotCenter: ISnapshotCenter;

  public readonly statusCenter: IStatusCenter;

  public readonly reporter: IReporter;

  private subContexts: IContext[] = [];

  constructor(data: ContextData) {
    this.id = uuid();
    this.document = data.document;
    this.variableStore = data.variableStore;
    this.state = data.state;
    this.ioCenter = data.ioCenter;
    this.snapshotCenter = data.snapshotCenter;
    this.statusCenter = data.statusCenter;
    this.reporter = data.reporter;
  }

  public init(params: InvokeParams): void {
    const { schema, inputs } = params;
    this.document.init(schema);
    this.variableStore.init();
    this.state.init();
    this.ioCenter.init(inputs);
    this.snapshotCenter.init();
    this.statusCenter.init();
    this.reporter.init();
  }

  public dispose(): void {
    this.subContexts.forEach((subContext) => {
      subContext.dispose();
    });
    this.subContexts = [];
    this.document.dispose();
    this.variableStore.dispose();
    this.state.dispose();
    this.ioCenter.dispose();
    this.snapshotCenter.dispose();
    this.statusCenter.dispose();
    this.reporter.dispose();
  }

  public sub(): IContext {
    const variableStore = new WorkflowRuntimeVariableStore();
    variableStore.setParent(this.variableStore);
    const state = new WorkflowRuntimeState(variableStore);
    const contextData: ContextData = {
      document: this.document,
      ioCenter: this.ioCenter,
      snapshotCenter: this.snapshotCenter,
      statusCenter: this.statusCenter,
      reporter: this.reporter,
      variableStore,
      state,
    };
    const subContext = new WorkflowRuntimeContext(contextData);
    this.subContexts.push(subContext);
    subContext.variableStore.init();
    subContext.state.init();
    return subContext;
  }

  public static create(): IContext {
    const document = new WorkflowRuntimeDocument();
    const variableStore = new WorkflowRuntimeVariableStore();
    const state = new WorkflowRuntimeState(variableStore);
    const ioCenter = new WorkflowRuntimeIOCenter();
    const snapshotCenter = new WorkflowRuntimeSnapshotCenter();
    const statusCenter = new WorkflowRuntimeStatusCenter();
    const reporter = new WorkflowRuntimeReporter(ioCenter, snapshotCenter, statusCenter);
    return new WorkflowRuntimeContext({
      document,
      variableStore,
      state,
      ioCenter,
      snapshotCenter,
      statusCenter,
      reporter,
    });
  }
}
