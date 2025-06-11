import { ServerInfoOutput } from '@flowgram.ai/runtime-interface';

export interface ServerParams extends Omit<ServerInfoOutput, 'time'> {
  dev: boolean;
  port: number;
  basePath: string;
  docsPath: string;
}
