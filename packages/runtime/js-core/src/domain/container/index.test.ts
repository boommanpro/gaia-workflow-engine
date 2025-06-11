import { describe, expect, it } from 'vitest';
import { IEngine, IExecutor, IValidation } from '@flowgram.ai/runtime-interface';

import { WorkflowRuntimeContainer } from './index';

describe('WorkflowRuntimeContainer', () => {
  it('should create a container instance', () => {
    const container = new WorkflowRuntimeContainer({});
    expect(container).toBeDefined();
    expect(container).toBeInstanceOf(WorkflowRuntimeContainer);
  });

  it('should get services correctly', () => {
    const mockServices = {
      [IValidation]: { id: 'validation' },
      [IExecutor]: { id: 'executor' },
      [IEngine]: { id: 'engine' },
    };

    const container = new WorkflowRuntimeContainer(mockServices);

    expect(container.get(IValidation)).toEqual({ id: 'validation' });
    expect(container.get(IExecutor)).toEqual({ id: 'executor' });
    expect(container.get(IEngine)).toEqual({ id: 'engine' });
  });

  it('should maintain singleton instance', () => {
    const instance1 = WorkflowRuntimeContainer.instance;
    const instance2 = WorkflowRuntimeContainer.instance;

    expect(instance1).toBeDefined();
    expect(instance2).toBeDefined();
    expect(instance1).toBe(instance2);
  });

  it('should create services correctly', () => {
    const services = (WorkflowRuntimeContainer as any).create();

    expect(services[IValidation]).toBeDefined();
    expect(services[IExecutor]).toBeDefined();
    expect(services[IEngine]).toBeDefined();
  });
});
