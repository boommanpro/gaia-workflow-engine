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

describe('WorkflowRuntime http schema', () => {
  it('should execute a workflow with HTTP request', async () => {
    if (process.env.ENABLE_REAL_TESTS !== 'true') {
      return;
    }
    const engine = container.get<IEngine>(IEngine);
    const { context, processing } = engine.invoke({
      schema: TestSchemas.httpSchema,
      inputs: {
        host: 'httpbin.org',
        path: '/post',
      },
    });
    expect(context.statusCenter.workflow.status).toBe(WorkflowStatus.Processing);
    const result = await processing;
    expect(context.statusCenter.workflow.status).toBe(WorkflowStatus.Succeeded);

    // Verify the result structure
    expect(result).toHaveProperty('res');
    expect(result).toHaveProperty('code');
    expect(typeof result.res).toBe('string');
    expect(typeof result.code).toBe('number');
    expect(result.code).toBe(200);

    const snapshots = snapshotsToVOData(context.snapshotCenter.exportAll());
    expect(snapshots).toHaveLength(3);

    // Verify start node snapshot
    expect(snapshots[0]).toMatchObject({
      nodeID: 'start_0',
      inputs: {},
      outputs: {
        host: 'httpbin.org',
        path: '/post',
      },
      data: {},
    });

    // Verify http node snapshot
    expect(snapshots[1]).toMatchObject({
      nodeID: 'http_0',
      inputs: {
        method: 'POST',
        url: 'https://httpbin.org/post',
        body: '{}',
        headers: {},
        params: {},
        timeout: 10000,
        retryTimes: 1,
      },
      data: {},
    });
    expect(snapshots[1].outputs).toHaveProperty('body');
    expect(snapshots[1].outputs).toHaveProperty('headers');
    expect(snapshots[1].outputs).toHaveProperty('statusCode');
    expect(snapshots[1].outputs.statusCode).toBe(200);

    // Verify end node snapshot
    expect(snapshots[2]).toMatchObject({
      nodeID: 'end_0',
      data: {},
    });
    expect(snapshots[2].inputs).toHaveProperty('res');
    expect(snapshots[2].inputs).toHaveProperty('code');
    expect(snapshots[2].outputs).toHaveProperty('res');
    expect(snapshots[2].outputs).toHaveProperty('code');
    expect(snapshots[2].outputs.code).toBe(200);

    const report = context.reporter.export();
    expect(report.workflowStatus.status).toBe(WorkflowStatus.Succeeded);
    expect(report.reports.start_0.status).toBe(WorkflowStatus.Succeeded);
    expect(report.reports.http_0.status).toBe(WorkflowStatus.Succeeded);
    expect(report.reports.end_0.status).toBe(WorkflowStatus.Succeeded);
  });

  it('should handle HTTP request with different inputs', async () => {
    if (process.env.ENABLE_REAL_TESTS !== 'true') {
      return;
    }
    const engine = container.get<IEngine>(IEngine);
    const { context, processing } = engine.invoke({
      schema: TestSchemas.httpSchema,
      inputs: {
        host: 'jsonplaceholder.typicode.com',
        path: '/posts',
      },
    });
    expect(context.statusCenter.workflow.status).toBe(WorkflowStatus.Processing);
    const result = await processing;
    expect(context.statusCenter.workflow.status).toBe(WorkflowStatus.Succeeded);

    // Verify the result structure
    expect(result).toHaveProperty('res');
    expect(result).toHaveProperty('code');
    expect(typeof result.res).toBe('string');
    expect(typeof result.code).toBe('number');
    expect(result.code).toBe(201);

    const report = context.reporter.export();
    expect(report.workflowStatus.status).toBe(WorkflowStatus.Succeeded);
    expect(report.reports.start_0.status).toBe(WorkflowStatus.Succeeded);
    expect(report.reports.http_0.status).toBe(WorkflowStatus.Succeeded);
    expect(report.reports.end_0.status).toBe(WorkflowStatus.Succeeded);
  });
});
