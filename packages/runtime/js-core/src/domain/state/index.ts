import { isNil } from 'lodash-es';
import {
  IState,
  IFlowConstantRefValue,
  IFlowRefValue,
  IVariableParseResult,
  INode,
  WorkflowInputs,
  WorkflowOutputs,
  IVariableStore,
  WorkflowVariableType,
} from '@flowgram.ai/runtime-interface';

import { uuid, WorkflowRuntimeType } from '@infra/utils';

export class WorkflowRuntimeState implements IState {
  public readonly id: string;

  private executedNodes: Set<string>;

  constructor(public readonly variableStore: IVariableStore) {
    this.id = uuid();
  }

  public init(): void {
    this.executedNodes = new Set();
  }

  public dispose(): void {
    this.executedNodes.clear();
  }

  public getNodeInputs(node: INode): WorkflowInputs {
    const inputsDeclare = node.declare.inputs;
    const inputsValues = node.declare.inputsValues;
    if (!inputsDeclare || !inputsValues) {
      return {};
    }
    return Object.entries(inputsValues).reduce((prev, [key, inputValue]) => {
      const typeInfo = inputsDeclare.properties?.[key];
      if (!typeInfo) {
        return prev;
      }
      const expectType = typeInfo.type as WorkflowVariableType;
      // get value
      const result = this.parseValue(inputValue);
      if (!result) {
        return prev;
      }
      const { value, type } = result;
      if (!WorkflowRuntimeType.isTypeEqual(type, expectType)) {
        return prev;
      }
      prev[key] = value;
      return prev;
    }, {} as WorkflowInputs);
  }

  public setNodeOutputs(params: { node: INode; outputs: WorkflowOutputs }): void {
    const { node, outputs } = params;
    const outputsDeclare = node.declare.outputs;
    // TODO validation service type check, deeply compare input & schema
    if (!outputsDeclare) {
      return;
    }
    Object.entries(outputs).forEach(([key, value]) => {
      const typeInfo = outputsDeclare.properties?.[key];
      if (!typeInfo) {
        return;
      }
      const type = typeInfo.type as WorkflowVariableType;
      const itemsType = typeInfo.items?.type as WorkflowVariableType;
      // create variable
      this.variableStore.setVariable({
        nodeID: node.id,
        key,
        value,
        type,
        itemsType,
      });
    });
  }

  public parseRef<T = unknown>(ref: IFlowRefValue): IVariableParseResult<T> | null {
    if (ref?.type !== 'ref') {
      throw new Error(`invalid ref value: ${ref}`);
    }
    if (!ref.content || ref.content.length < 2) {
      return null;
    }
    const [nodeID, variableKey, ...variablePath] = ref.content;
    const result = this.variableStore.getValue<T>({
      nodeID,
      variableKey,
      variablePath,
    });
    if (!result) {
      return null;
    }
    return result;
  }

  public parseValue<T = unknown>(flowValue: IFlowConstantRefValue): IVariableParseResult<T> | null {
    if (!flowValue?.type) {
      throw new Error(`invalid flow value type: ${(flowValue as any).type}`);
    }
    // constant
    if (flowValue.type === 'constant') {
      const value = flowValue.content as T;
      const type = WorkflowRuntimeType.getWorkflowType(value);
      if (isNil(value) || !type) {
        return null;
      }
      return {
        value,
        type,
      };
    }
    // ref
    if (flowValue.type === 'ref') {
      return this.parseRef<T>(flowValue);
    }
    // unknown type
    throw new Error(`unknown flow value type: ${(flowValue as any).type}`);
  }

  public isExecutedNode(node: INode): boolean {
    return this.executedNodes.has(node.id);
  }

  public addExecutedNode(node: INode): void {
    this.executedNodes.add(node.id);
  }
}
