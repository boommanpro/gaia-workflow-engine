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

describe('WorkflowRuntime basic schema', () => {
  it('should execute a workflow with input', async () => {
    const engine = container.get<IEngine>(IEngine);
    const { context, processing } = engine.invoke({
      schema: TestSchemas.basicSchema,
      inputs: {
        model_name: 'ai-model',
        llm_settings: {
          temperature: 0.5,
        },
        work: {
          role: 'Chat',
          task: 'Tell me a story about love',
        },
      },
    });
    expect(context.statusCenter.workflow.status).toBe(WorkflowStatus.Processing);
    const result = await processing;
    expect(context.statusCenter.workflow.status).toBe(WorkflowStatus.Succeeded);
    expect(result).toStrictEqual({
      llm_res: `Hi, I am an AI model, my name is ai-model, temperature is 0.5, system prompt is "You are a helpful AI assistant.", prompt is "<Role>Chat</Role>\n\n<Task>\nTell me a story about love\n</Task>"`,
      llm_task: 'Tell me a story about love',
    });
    const snapshots = snapshotsToVOData(context.snapshotCenter.exportAll());
    expect(snapshots).toStrictEqual([
      {
        nodeID: 'start_0',
        inputs: {},
        outputs: {
          model_name: 'ai-model',
          llm_settings: { temperature: 0.5 },
          work: { role: 'Chat', task: 'Tell me a story about love' },
        },
        data: {},
      },
      {
        nodeID: 'llm_0',
        inputs: {
          modelName: 'ai-model',
          apiKey: 'sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
          apiHost: 'https://mock-ai-url/api/v3',
          temperature: 0.5,
          prompt: '<Role>Chat</Role>\n\n<Task>\nTell me a story about love\n</Task>',
          systemPrompt: 'You are a helpful AI assistant.',
        },
        outputs: {
          result:
            'Hi, I am an AI model, my name is ai-model, temperature is 0.5, system prompt is "You are a helpful AI assistant.", prompt is "<Role>Chat</Role>\n\n<Task>\nTell me a story about love\n</Task>"',
        },
        data: {},
      },
      {
        nodeID: 'end_0',
        inputs: {
          llm_res:
            'Hi, I am an AI model, my name is ai-model, temperature is 0.5, system prompt is "You are a helpful AI assistant.", prompt is "<Role>Chat</Role>\n\n<Task>\nTell me a story about love\n</Task>"',
          llm_task: 'Tell me a story about love',
        },
        outputs: {
          llm_res:
            'Hi, I am an AI model, my name is ai-model, temperature is 0.5, system prompt is "You are a helpful AI assistant.", prompt is "<Role>Chat</Role>\n\n<Task>\nTell me a story about love\n</Task>"',
          llm_task: 'Tell me a story about love',
        },
        data: {},
      },
    ]);
    const report = context.reporter.export();
    expect(report.workflowStatus.status).toBe(WorkflowStatus.Succeeded);
    expect(report.reports.start_0.status).toBe(WorkflowStatus.Succeeded);
    expect(report.reports.llm_0.status).toBe(WorkflowStatus.Succeeded);
    expect(report.reports.end_0.status).toBe(WorkflowStatus.Succeeded);
  });
});
