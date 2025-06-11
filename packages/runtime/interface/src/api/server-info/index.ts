import z from 'zod';

import { type FlowGramAPIDefine } from '@api/type';
import { FlowGramAPIMethod, FlowGramAPIModule, FlowGramAPIName } from '@api/constant';

export interface ServerInfoInput {}

export interface ServerInfoOutput {
  name: string;
  title: string;
  description: string;
  runtime: string;
  version: string;
  time: string;
}

export const ServerInfoDefine: FlowGramAPIDefine = {
  name: FlowGramAPIName.ServerInfo,
  method: FlowGramAPIMethod.GET,
  path: '/info',
  module: FlowGramAPIModule.Info,
  schema: {
    input: z.undefined(),
    output: z.object({
      name: z.string(),
      runtime: z.string(),
      version: z.string(),
      time: z.string(),
    }),
  },
};
