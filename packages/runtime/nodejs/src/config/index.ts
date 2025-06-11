import type { ServerParams } from '@server/type';

export const ServerConfig: ServerParams = {
  name: 'flowgram-runtime',
  title: 'FlowGram Runtime',
  description: 'FlowGram Runtime Demo',
  runtime: 'nodejs',
  version: '0.0.1',
  dev: false,
  port: 4000,
  basePath: '/api',
  docsPath: '/docs',
};
