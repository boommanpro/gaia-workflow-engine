import { IVariableStore } from '@runtime/variable';
import { IStatusCenter } from '@runtime/status';
import { ISnapshotCenter } from '@runtime/snapshot';
import { IIOCenter } from '@runtime/io-center';
import { IState } from '../state';
import { IReporter } from '../reporter';
import { IDocument } from '../document';
import { InvokeParams } from '../base';

export interface ContextData {
  variableStore: IVariableStore;
  state: IState;
  document: IDocument;
  ioCenter: IIOCenter;
  snapshotCenter: ISnapshotCenter;
  statusCenter: IStatusCenter;
  reporter: IReporter;
}

export interface IContext extends ContextData {
  id: string;
  init(params: InvokeParams): void;
  dispose(): void;
  sub(): IContext;
}
