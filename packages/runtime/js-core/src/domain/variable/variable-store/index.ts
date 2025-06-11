import { get, set } from 'lodash-es';
import {
  WorkflowVariableType,
  IVariableStore,
  IVariable,
  IVariableParseResult,
} from '@flowgram.ai/runtime-interface';

import { uuid, WorkflowRuntimeType } from '@infra/utils';
import { WorkflowRuntimeVariable } from '../variable-value-object';

export class WorkflowRuntimeVariableStore implements IVariableStore {
  public readonly id: string;

  private parent?: WorkflowRuntimeVariableStore;

  constructor() {
    this.id = uuid();
  }

  public store: Map<string, Map<string, IVariable>>;

  public init(): void {
    this.store = new Map();
  }

  public dispose(): void {
    this.store.clear();
  }

  public setParent(parent: IVariableStore): void {
    this.parent = parent as WorkflowRuntimeVariableStore;
  }

  public globalGet(nodeID: string): Map<string, IVariable> | undefined {
    const store = this.store.get(nodeID);
    if (!store && this.parent) {
      return this.parent.globalGet(nodeID);
    }
    return store;
  }

  public setVariable(params: {
    nodeID: string;
    key: string;
    value: Object;
    type: WorkflowVariableType;
    itemsType?: WorkflowVariableType;
  }): void {
    const { nodeID, key, value, type, itemsType } = params;
    if (!this.store.has(nodeID)) {
      // create node store
      this.store.set(nodeID, new Map());
    }
    const nodeStore = this.store.get(nodeID)!;
    // create variable store
    const variable = WorkflowRuntimeVariable.create({
      nodeID,
      key,
      value,
      type, // TODO check type
      itemsType, // TODO check is array
    });
    nodeStore.set(key, variable);
  }

  public setValue(params: {
    nodeID: string;
    variableKey: string;
    variablePath?: string[];
    value: Object;
  }): void {
    const { nodeID, variableKey, variablePath, value } = params;
    if (!this.store.has(nodeID)) {
      // create node store
      this.store.set(nodeID, new Map());
    }
    const nodeStore = this.store.get(nodeID)!;
    if (!nodeStore.has(variableKey)) {
      // create variable store
      const variable = WorkflowRuntimeVariable.create({
        nodeID,
        key: variableKey,
        value: {},
        type: WorkflowVariableType.Object,
      });
      nodeStore.set(variableKey, variable);
    }
    const variable = nodeStore.get(variableKey)!;
    if (!variablePath) {
      variable.value = value;
      return;
    }
    set(variable.value, variablePath, value);
  }

  public getValue<T = unknown>(params: {
    nodeID: string;
    variableKey: string;
    variablePath?: string[];
  }): IVariableParseResult<T> | null {
    const { nodeID, variableKey, variablePath } = params;
    const variable = this.globalGet(nodeID)?.get(variableKey);
    if (!variable) {
      return null;
    }
    if (!variablePath || variablePath.length === 0) {
      return {
        value: variable.value as T,
        type: variable.type,
        itemsType: variable.itemsType,
      };
    }
    const value = get(variable.value, variablePath) as T;
    const type = WorkflowRuntimeType.getWorkflowType(value);
    if (!type) {
      return null;
    }
    if (type === WorkflowVariableType.Array && Array.isArray(value)) {
      const itemsType = WorkflowRuntimeType.getWorkflowType(value[0]);
      if (!itemsType) {
        return null;
      }
      return {
        value,
        type,
        itemsType,
      };
    }
    return {
      value,
      type,
    };
  }
}
