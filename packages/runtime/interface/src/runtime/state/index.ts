import { IFlowConstantRefValue, IFlowRefValue, WorkflowVariableType } from '@schema/index';
import { IVariableParseResult, IVariableStore } from '../variable';
import { INode } from '../document';
import { WorkflowInputs, WorkflowOutputs } from '../base';

export interface IState {
  id: string;
  variableStore: IVariableStore;
  init(): void;
  dispose(): void;
  getNodeInputs(node: INode): WorkflowInputs;
  setNodeOutputs(params: { node: INode; outputs: WorkflowOutputs }): void;
  parseRef<T = unknown>(ref: IFlowRefValue): IVariableParseResult<T> | null;
  parseValue<T = unknown>(
    flowValue: IFlowConstantRefValue,
    type?: WorkflowVariableType
  ): IVariableParseResult<T> | null;
  isExecutedNode(node: INode): boolean;
  addExecutedNode(node: INode): void;
}
