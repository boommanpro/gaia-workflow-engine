/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { describe, expect, it } from 'vitest';
import { IContainer, IEngine, WorkflowStatus } from '@flowgram.ai/runtime-interface';

import { snapshotsToVOData } from '../utils';
import { WorkflowRuntimeContainer } from '../../container';
import { TestSchemas } from '.';

const container: IContainer = WorkflowRuntimeContainer.instance;

describe('WorkflowRuntime end constant schema', () => {
  it('should execute a workflow', async () => {
    const engine = container.get<IEngine>(IEngine);
    const { context, processing } = engine.invoke({
      schema: TestSchemas.endConstantSchema,
      inputs: {},
    });
    expect(context.statusCenter.workflow.status).toBe(WorkflowStatus.Processing);
    const result = await processing;
    expect(context.statusCenter.workflow.status).toBe(WorkflowStatus.Succeeded);
    expect(result).toStrictEqual({
      str: 'ABC',
      num: 123.123,
      int: 123,
      bool: false,
      obj: {
        key_str: 'value',
        key_int: 123,
        key_bool: true,
      },
      map: {
        key: 'value',
      },
      arr_str: ['AAA', 'BBB', 'CCC'],
      date: '2000-01-01T00:00:00.000Z',
    });
    const snapshots = snapshotsToVOData(context.snapshotCenter.exportAll());
    expect(snapshots).toStrictEqual([
      { nodeID: 'start_0', inputs: {}, outputs: {}, data: {} },
      {
        nodeID: 'end_0',
        inputs: {
          str: 'ABC',
          num: 123.123,
          int: 123,
          bool: false,
          obj: { key_str: 'value', key_int: 123, key_bool: true },
          map: { key: 'value' },
          arr_str: ['AAA', 'BBB', 'CCC'],
          date: '2000-01-01T00:00:00.000Z',
        },
        outputs: {
          str: 'ABC',
          num: 123.123,
          int: 123,
          bool: false,
          obj: { key_str: 'value', key_int: 123, key_bool: true },
          map: { key: 'value' },
          arr_str: ['AAA', 'BBB', 'CCC'],
          date: '2000-01-01T00:00:00.000Z',
        },
        data: {},
      },
    ]);
    const report = context.reporter.export();
    expect(report.workflowStatus.status).toBe(WorkflowStatus.Succeeded);
    expect(report.reports.start_0.status).toBe(WorkflowStatus.Succeeded);
    expect(report.reports.end_0.status).toBe(WorkflowStatus.Succeeded);
  });
});
