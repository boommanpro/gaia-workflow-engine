import { beforeEach, describe, expect, it } from 'vitest';
import { IVariableStore, WorkflowVariableType } from '@flowgram.ai/runtime-interface';

import { WorkflowRuntimeVariableStore } from './index';

describe('WorkflowRuntimeVariableStore', () => {
  let variableStore: IVariableStore;

  beforeEach(() => {
    variableStore = new WorkflowRuntimeVariableStore();
    variableStore.init();
  });

  it('should create a store with unique id', () => {
    const store1 = new WorkflowRuntimeVariableStore();
    const store2 = new WorkflowRuntimeVariableStore();
    expect(store1.id).toBeTruthy();
    expect(store2.id).toBeTruthy();
    expect(store1.id).not.toBe(store2.id);
  });

  describe('set', () => {
    it('should set variable', () => {
      const value = { foo: 'bar' };
      variableStore.setVariable({
        nodeID: 'node1',
        key: 'var1',
        value,
        type: WorkflowVariableType.Object,
      });

      expect(variableStore.store.get('node1')?.get('var1')?.value).toEqual(value);
    });

    it('should update existing variable', () => {
      variableStore.setVariable({
        nodeID: 'node1',
        key: 'var1',
        value: { foo: 'bar' },
        type: WorkflowVariableType.Object,
      });

      variableStore.setVariable({
        nodeID: 'node1',
        key: 'var1',
        value: { baz: 'qux' },
        type: WorkflowVariableType.Object,
      });

      expect(variableStore.store.get('node1')?.get('var1')?.value).toEqual({ baz: 'qux' });
    });
  });

  describe('setValue', () => {
    it('should set value without path', () => {
      const value = { foo: 'bar' };
      variableStore.setValue({
        nodeID: 'node1',
        variableKey: 'var1',
        value,
      });

      expect(variableStore.store.get('node1')?.get('var1')?.value).toEqual(value);
    });

    it('should set value with path', () => {
      variableStore.setValue({
        nodeID: 'node1',
        variableKey: 'var1',
        variablePath: ['foo', 'bar'],
        value: 'baz',
      });

      expect(variableStore.store.get('node1')?.get('var1')?.value).toEqual({
        foo: { bar: 'baz' },
      });
    });

    it('should update existing value', () => {
      variableStore.setValue({
        nodeID: 'node1',
        variableKey: 'var1',
        value: { foo: 'bar' },
      });

      variableStore.setValue({
        nodeID: 'node1',
        variableKey: 'var1',
        value: { baz: 'qux' },
      });

      expect(variableStore.store.get('node1')?.get('var1')?.value).toEqual({ baz: 'qux' });
    });
  });

  describe('get', () => {
    beforeEach(() => {
      variableStore.setValue({
        nodeID: 'node1',
        variableKey: 'var1',
        value: { foo: { bar: 'baz' } },
      });
    });

    it('should get value without path', () => {
      const result = variableStore.getValue({
        nodeID: 'node1',
        variableKey: 'var1',
      });

      expect(result?.value).toEqual({ foo: { bar: 'baz' } });
    });

    it('should get value with path', () => {
      const result = variableStore.getValue({
        nodeID: 'node1',
        variableKey: 'var1',
        variablePath: ['foo', 'bar'],
      });

      expect(result?.value).toBe('baz');
    });

    it('should get value with empty path', () => {
      const result = variableStore.getValue({
        nodeID: 'node1',
        variableKey: 'var1',
        variablePath: [],
      });

      expect(result?.value).toStrictEqual({ foo: { bar: 'baz' } });
    });

    it('should get value with undefined path', () => {
      const result = variableStore.getValue({
        nodeID: 'node1',
        variableKey: 'var1',
      });

      expect(result?.value).toStrictEqual({ foo: { bar: 'baz' } });
    });

    it('should return undefined for non-existent node', () => {
      const result = variableStore.getValue({
        nodeID: 'non-existent',
        variableKey: 'var1',
      });

      expect(result?.value).toBeUndefined();
    });

    it('should return undefined for non-existent variable', () => {
      const result = variableStore.getValue({
        nodeID: 'node1',
        variableKey: 'non-existent',
      });

      expect(result?.value).toBeUndefined();
    });

    it('should return undefined for non-existent path', () => {
      const result = variableStore.getValue({
        nodeID: 'node1',
        variableKey: 'var1',
        variablePath: ['non', 'existent'],
      });

      expect(result?.value).toBeUndefined();
    });

    it('should get number value', () => {
      variableStore.setVariable({
        nodeID: 'start_0',
        key: 'llm_settings',
        value: { temperature: 0.5 },
        type: WorkflowVariableType.Object,
      });

      const result = variableStore.getValue({
        nodeID: 'start_0',
        variableKey: 'llm_settings',
        variablePath: ['temperature'],
      });

      expect(result?.value).toBe(0.5);
    });

    it('should return 0', () => {
      variableStore.setValue({
        nodeID: 'node1',
        variableKey: 'var1',
        value: 0,
      });
      const result = variableStore.getValue({
        nodeID: 'node1',
        variableKey: 'var1',
      });
      expect(result?.value).toBe(0);
    });
  });
});
