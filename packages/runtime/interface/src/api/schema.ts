/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import z from 'zod';

const WorkflowIOZodSchema = z.record(z.string(), z.any());

const WorkflowSnapshotZodSchema = z.object({
  id: z.string(),
  nodeID: z.string(),
  inputs: WorkflowIOZodSchema,
  outputs: WorkflowIOZodSchema.optional(),
  data: WorkflowIOZodSchema,
  branch: z.string().optional(),
});

const WorkflowStatusZodShape = {
  status: z.string(),
  terminated: z.boolean(),
  startTime: z.number(),
  endTime: z.number().optional(),
  timeCost: z.number(),
};
const WorkflowStatusZodSchema = z.object(WorkflowStatusZodShape);

const WorkflowNodeReportZodSchema = z.object({
  id: z.string(),
  ...WorkflowStatusZodShape,
  snapshots: z.array(WorkflowSnapshotZodSchema),
});

const WorkflowReportsZodSchema = z.record(z.string(), WorkflowNodeReportZodSchema);

const WorkflowMessageZodSchema = z.object({
  id: z.string(),
  type: z.enum(['log', 'info', 'debug', 'error', 'warning']),
  message: z.string(),
  nodeID: z.string().optional(),
  timestamp: z.number(),
});

const WorkflowMessagesZodSchema = z.record(
  z.enum(['log', 'info', 'debug', 'error', 'warning']),
  z.array(WorkflowMessageZodSchema)
);

export const WorkflowZodSchema = {
  Inputs: WorkflowIOZodSchema,
  Outputs: WorkflowIOZodSchema,
  Status: WorkflowStatusZodSchema,
  Snapshot: WorkflowSnapshotZodSchema,
  Reports: WorkflowReportsZodSchema,
  Messages: WorkflowMessagesZodSchema,
};
