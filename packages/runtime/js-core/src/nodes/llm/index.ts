import { isNil } from 'lodash-es';
import { ChatOpenAI } from '@langchain/openai';
import { SystemMessage, HumanMessage, BaseMessageLike } from '@langchain/core/messages';
import {
  ExecutionContext,
  ExecutionResult,
  FlowGramNode,
  INodeExecutor,
} from '@flowgram.ai/runtime-interface';

export interface LLMExecutorInputs {
  modelName: string;
  apiKey: string;
  apiHost: string;
  temperature: number;
  systemPrompt?: string;
  prompt: string;
}

export class LLMExecutor implements INodeExecutor {
  public type = FlowGramNode.LLM;

  public async execute(context: ExecutionContext): Promise<ExecutionResult> {
    const inputs = context.inputs as LLMExecutorInputs;
    this.checkInputs(inputs);

    const { modelName, temperature, apiKey, apiHost, systemPrompt, prompt } = inputs;

    const model = new ChatOpenAI({
      modelName,
      temperature,
      apiKey,
      configuration: {
        baseURL: apiHost,
      },
    });

    const messages: BaseMessageLike[] = [];

    if (systemPrompt) {
      messages.push(new SystemMessage(systemPrompt));
    }
    messages.push(new HumanMessage(prompt));

    const apiMessage = await model.invoke(messages);

    const result = apiMessage.content;
    return {
      outputs: {
        result,
      },
    };
  }

  protected checkInputs(inputs: LLMExecutorInputs) {
    const { modelName, temperature, apiKey, apiHost, prompt } = inputs;
    const missingInputs = [];

    if (isNil(modelName)) missingInputs.push('modelName');
    if (isNil(temperature)) missingInputs.push('temperature');
    if (isNil(apiKey)) missingInputs.push('apiKey');
    if (isNil(apiHost)) missingInputs.push('apiHost');
    if (isNil(prompt)) missingInputs.push('prompt');

    if (missingInputs.length > 0) {
      throw new Error(`LLM node missing required inputs: ${missingInputs.join(', ')}`);
    }
  }
}
