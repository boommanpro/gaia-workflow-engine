import type z from 'zod';

import { FlowGramAPIMethod, FlowGramAPIModule, FlowGramAPIName } from './constant';

export interface FlowGramAPIDefine {
  name: FlowGramAPIName;
  method: FlowGramAPIMethod;
  path: `/${string}`;
  module: FlowGramAPIModule;
  schema: {
    input: z.ZodFirstPartySchemaTypes;
    output: z.ZodFirstPartySchemaTypes;
  };
}

export interface FlowGramAPIDefines {
  [key: string]: FlowGramAPIDefine;
}
