import z from 'zod';

import { ValidationResult } from '@runtime/index';
import { FlowGramAPIDefine } from '@api/type';
import { FlowGramAPIMethod, FlowGramAPIModule, FlowGramAPIName } from '@api/constant';

export interface ValidationReq {
  schema: string;
}

export interface ValidationRes extends ValidationResult {}

export const ValidationDefine: FlowGramAPIDefine = {
  name: FlowGramAPIName.Validation,
  method: FlowGramAPIMethod.POST,
  path: '/validation',
  module: FlowGramAPIModule.Validation,
  schema: {
    input: z.object({
      schema: z.string(),
    }),
    output: z.object({
      valid: z.boolean(),
      nodeErrors: z.array(
        z.object({
          message: z.string(),
          nodeID: z.string(),
        })
      ),
      edgeErrors: z.array(
        z.object({
          message: z.string(),
          edge: z.object({
            sourceNodeID: z.string(),
            targetNodeID: z.string(),
            sourcePortID: z.string().optional(),
            targetPortID: z.string().optional(),
          }),
        })
      ),
    }),
  },
};
