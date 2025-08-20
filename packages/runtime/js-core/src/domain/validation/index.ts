/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import {
  WorkflowSchema,
  IValidation,
  ValidationResult,
  InvokeParams,
  IJsonSchema,
  FlowGramNode,
} from '@flowgram.ai/runtime-interface';

import { JSONSchemaValidator } from '@infra/index';
import { cycleDetection, edgeSourceTargetExist, startEndNode, schemaFormat } from './validators';

export class WorkflowRuntimeValidation implements IValidation {
  public invoke(params: InvokeParams): ValidationResult {
    const { schema, inputs } = params;
    const schemaValidationResult = this.schema(schema);
    if (!schemaValidationResult.valid) {
      return schemaValidationResult;
    }
    const inputsValidationResult = this.inputs(this.getWorkflowInputsDeclare(schema), inputs);
    if (!inputsValidationResult.valid) {
      return inputsValidationResult;
    }
    return {
      valid: true,
    };
  }

  private schema(schema: WorkflowSchema): ValidationResult {
    const errors: string[] = [];

    // Run all validations concurrently and collect errors
    const validations = [
      () => schemaFormat(schema),
      () => cycleDetection(schema),
      () => edgeSourceTargetExist(schema),
      () => startEndNode(schema),
    ];

    // Execute all validations and collect any errors
    validations.forEach((validation) => {
      try {
        validation();
      } catch (error) {
        errors.push(error instanceof Error ? error.message : String(error));
      }
    });

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  private inputs(inputsSchema: IJsonSchema, inputs: Record<string, unknown>): ValidationResult {
    const { result, errorMessage } = JSONSchemaValidator({
      schema: inputsSchema,
      value: inputs,
    });
    if (!result) {
      const error = `JSON Schema validation failed: ${errorMessage}`;
      return {
        valid: false,
        errors: [error],
      };
    }
    return {
      valid: true,
    };
  }

  private getWorkflowInputsDeclare(schema: WorkflowSchema): IJsonSchema {
    const startNode = schema.nodes.find((node) => node.type === FlowGramNode.Start)!;
    if (!startNode) {
      throw new Error('Workflow schema must have a start node');
    }
    return startNode.data.outputs;
  }
}
