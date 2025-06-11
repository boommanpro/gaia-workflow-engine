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

export const WorkflowZodSchema = {
  Inputs: WorkflowIOZodSchema,
  Outputs: WorkflowIOZodSchema,
  Status: WorkflowStatusZodSchema,
  Snapshot: WorkflowSnapshotZodSchema,
  NodeReport: z.object({
    id: z.string(),
    ...WorkflowStatusZodShape,
    snapshots: z.array(WorkflowSnapshotZodSchema),
  }),
};
