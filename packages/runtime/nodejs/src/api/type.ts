import { BuildProcedure } from '@trpc/server';
import { FlowGramAPIDefine } from '@flowgram.ai/runtime-interface';

export interface APIHandler {
  define: FlowGramAPIDefine;
  procedure: BuildProcedure<any, any, any>;
}

export type APIRouter = Record<FlowGramAPIDefine['path'], APIHandler['procedure']>;
