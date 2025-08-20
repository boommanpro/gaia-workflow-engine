/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import {
  CodeNodeSchema,
  ExecutionContext,
  ExecutionResult,
  FlowGramNode,
  INode,
  INodeExecutor,
} from '@flowgram.ai/runtime-interface';

export interface CodeExecutorInputs {
  params: Record<string, any>;
  script: {
    language: 'javascript';
    content: string;
  };
}

export class CodeExecutor implements INodeExecutor {
  public readonly type = FlowGramNode.Code;

  public async execute(context: ExecutionContext): Promise<ExecutionResult> {
    const inputs = this.parseInputs(context);
    if (inputs.script.language === 'javascript') {
      return this.javascript(inputs);
    }
    throw new Error(`Unsupported code language "${inputs.script.language}"`);
  }

  private parseInputs(context: ExecutionContext): CodeExecutorInputs {
    const codeNode = context.node as INode<CodeNodeSchema['data']>;
    const params = context.inputs;
    const { language, content } = codeNode.data.script;
    if (!content) {
      throw new Error('Code content is required');
    }
    return {
      params,
      script: {
        language,
        content,
      },
    };
  }

  private async javascript(inputs: CodeExecutorInputs): Promise<ExecutionResult> {
    // Extract script content and inputs
    const { params = {}, script } = inputs;

    try {
      // Create a safe execution environment with basic restrictions
      const executeCode = new Function(
        'params',
        `
        'use strict';

        ${script.content}

        // Ensure main function exists
        if (typeof main !== 'function') {
          throw new Error('main function is required in the script');
        }

        // Execute main function with params
        return main({ params });
        `
      );

      // Execute with timeout protection (1 minute)
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error('Code execution timeout: exceeded 1 minute'));
        }, 1000 * 60);
      });

      // Execute the code with input parameters and timeout
      const result = await Promise.race([executeCode(params), timeoutPromise]);

      // Ensure result is an object
      const outputs =
        result && typeof result === 'object' && !Array.isArray(result) ? result : { result };

      return {
        outputs,
      };
    } catch (error: any) {
      throw new Error(`Code execution failed: ${error.message}`);
    }
  }
}
