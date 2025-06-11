import { describe, expect, it } from 'vitest';
import { IContainer, IEngine, WorkflowStatus } from '@flowgram.ai/runtime-interface';

import { snapshotsToVOData } from '../utils';
import { WorkflowRuntimeContainer } from '../../container';
import { TestSchemas } from '.';

const container: IContainer = WorkflowRuntimeContainer.instance;

describe('WorkflowRuntime loop schema', () => {
  it('should execute a workflow with input', async () => {
    const engine = container.get<IEngine>(IEngine);
    const { context, processing } = engine.invoke({
      schema: TestSchemas.loopSchema,
      inputs: {
        prompt: 'How are you?',
        tasks: [
          'TASK - A',
          'TASK - B',
          'TASK - C',
          'TASK - D',
          'TASK - E',
          'TASK - F',
          'TASK - G',
          'TASK - H',
        ],
      },
    });
    expect(context.statusCenter.workflow.status).toBe(WorkflowStatus.Processing);
    const result = await processing;
    expect(context.statusCenter.workflow.status).toBe(WorkflowStatus.Succeeded);
    expect(result).toStrictEqual({});
    const snapshots = snapshotsToVOData(context.snapshotCenter.exportAll());
    expect(snapshots).toStrictEqual([
      {
        nodeID: 'start_0',
        inputs: {},
        outputs: {
          prompt: 'How are you?',
          tasks: [
            'TASK - A',
            'TASK - B',
            'TASK - C',
            'TASK - D',
            'TASK - E',
            'TASK - F',
            'TASK - G',
            'TASK - H',
          ],
        },
        data: {},
      },
      {
        nodeID: 'loop_0',
        inputs: {},
        outputs: {},
        data: { batchFor: { type: 'ref', content: ['start_0', 'tasks'] } },
      },
      {
        nodeID: 'llm_0',
        inputs: {
          modelName: 'AI_MODEL_1',
          apiKey: 'sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
          apiHost: 'https://mock-ai-url/api/v3',
          temperature: 0.6,
          prompt: 'TASK - A',
        },
        outputs: {
          result:
            'Hi, I\'m an AI assistant, my name is AI_MODEL_1, temperature is 0.6, system prompt is "undefined", prompt is "TASK - A"',
        },
        data: {},
      },
      {
        nodeID: 'llm_0',
        inputs: {
          modelName: 'AI_MODEL_1',
          apiKey: 'sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
          apiHost: 'https://mock-ai-url/api/v3',
          temperature: 0.6,
          prompt: 'TASK - B',
        },
        outputs: {
          result:
            'Hi, I\'m an AI assistant, my name is AI_MODEL_1, temperature is 0.6, system prompt is "undefined", prompt is "TASK - B"',
        },
        data: {},
      },
      {
        nodeID: 'llm_0',
        inputs: {
          modelName: 'AI_MODEL_1',
          apiKey: 'sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
          apiHost: 'https://mock-ai-url/api/v3',
          temperature: 0.6,
          prompt: 'TASK - C',
        },
        outputs: {
          result:
            'Hi, I\'m an AI assistant, my name is AI_MODEL_1, temperature is 0.6, system prompt is "undefined", prompt is "TASK - C"',
        },
        data: {},
      },
      {
        nodeID: 'llm_0',
        inputs: {
          modelName: 'AI_MODEL_1',
          apiKey: 'sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
          apiHost: 'https://mock-ai-url/api/v3',
          temperature: 0.6,
          prompt: 'TASK - D',
        },
        outputs: {
          result:
            'Hi, I\'m an AI assistant, my name is AI_MODEL_1, temperature is 0.6, system prompt is "undefined", prompt is "TASK - D"',
        },
        data: {},
      },
      {
        nodeID: 'llm_0',
        inputs: {
          modelName: 'AI_MODEL_1',
          apiKey: 'sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
          apiHost: 'https://mock-ai-url/api/v3',
          temperature: 0.6,
          prompt: 'TASK - E',
        },
        outputs: {
          result:
            'Hi, I\'m an AI assistant, my name is AI_MODEL_1, temperature is 0.6, system prompt is "undefined", prompt is "TASK - E"',
        },
        data: {},
      },
      {
        nodeID: 'llm_0',
        inputs: {
          modelName: 'AI_MODEL_1',
          apiKey: 'sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
          apiHost: 'https://mock-ai-url/api/v3',
          temperature: 0.6,
          prompt: 'TASK - F',
        },
        outputs: {
          result:
            'Hi, I\'m an AI assistant, my name is AI_MODEL_1, temperature is 0.6, system prompt is "undefined", prompt is "TASK - F"',
        },
        data: {},
      },
      {
        nodeID: 'llm_0',
        inputs: {
          modelName: 'AI_MODEL_1',
          apiKey: 'sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
          apiHost: 'https://mock-ai-url/api/v3',
          temperature: 0.6,
          prompt: 'TASK - G',
        },
        outputs: {
          result:
            'Hi, I\'m an AI assistant, my name is AI_MODEL_1, temperature is 0.6, system prompt is "undefined", prompt is "TASK - G"',
        },
        data: {},
      },
      {
        nodeID: 'llm_0',
        inputs: {
          modelName: 'AI_MODEL_1',
          apiKey: 'sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
          apiHost: 'https://mock-ai-url/api/v3',
          temperature: 0.6,
          prompt: 'TASK - H',
        },
        outputs: {
          result:
            'Hi, I\'m an AI assistant, my name is AI_MODEL_1, temperature is 0.6, system prompt is "undefined", prompt is "TASK - H"',
        },
        data: {},
      },
      { nodeID: 'end_0', inputs: {}, outputs: {}, data: {} },
    ]);
    const report = context.reporter.export();
    expect(report.workflowStatus.status).toBe(WorkflowStatus.Succeeded);
    expect(report.reports.start_0.status).toBe(WorkflowStatus.Succeeded);
    expect(report.reports.loop_0.status).toBe(WorkflowStatus.Succeeded);
    expect(report.reports.llm_0.status).toBe(WorkflowStatus.Succeeded);
    expect(report.reports.end_0.status).toBe(WorkflowStatus.Succeeded);
    expect(report.reports.llm_0.snapshots.length).toBe(8);
  });
});
