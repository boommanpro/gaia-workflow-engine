import { beforeEach, describe, expect, it } from 'vitest';

import { TestSchemas } from '@workflow/__tests__/schemas';
import { MockWorkflowRuntimeNodeExecutors } from '@workflow/__tests__/executor';
import { WorkflowRuntimeExecutor } from '../executor';
import { WorkflowRuntimeEngine } from './index';

let engine: WorkflowRuntimeEngine;

beforeEach(() => {
  const Executor = new WorkflowRuntimeExecutor(MockWorkflowRuntimeNodeExecutors);
  engine = new WorkflowRuntimeEngine({
    Executor,
  });
});

describe('WorkflowRuntimeEngine', () => {
  it('should create a WorkflowRuntimeEngine', () => {
    expect(engine).toBeDefined();
  });

  it('should execute a workflow with input', async () => {
    const { processing } = engine.invoke({
      schema: TestSchemas.basicSchema,
      inputs: {
        model_name: 'ai-model',
        llm_settings: {
          temperature: 0.5,
        },
        prompt: 'How are you?',
      },
    });
    const result = await processing;
    expect(result).toStrictEqual({
      llm_res: `Hi, I'm an AI assistant, my name is ai-model, temperature is 0.5, system prompt is "You are a helpful AI assistant.", prompt is "How are you?"`,
      llm_prompt: 'How are you?',
    });
  });

  it('should execute a workflow with branch', async () => {
    const { processing } = engine.invoke({
      schema: TestSchemas.branchSchema,
      inputs: {
        model_id: 1,
        prompt: 'Tell me a joke',
      },
    });
    const result = await processing;
    expect(result).toStrictEqual({
      m1_res: `Hi, I'm an AI assistant, my name is AI_MODEL_1, temperature is 0.5, system prompt is "I'm Model 1.", prompt is "Tell me a joke"`,
    });
  });
});
