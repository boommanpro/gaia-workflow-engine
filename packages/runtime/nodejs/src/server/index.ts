import { fastifyTRPCOpenApiPlugin } from 'trpc-openapi';
import fastify from 'fastify';
import { fastifyTRPCPlugin } from '@trpc/server/adapters/fastify';
import { ServerInfoDefine, type ServerInfoOutput } from '@flowgram.ai/runtime-interface';
import ws from '@fastify/websocket';
import fastifySwaggerUI from '@fastify/swagger-ui';
import fastifySwagger from '@fastify/swagger';
import cors from '@fastify/cors';

import { ServerConfig } from '@config/index';
import { appRouter } from '@api/index';
import { serverDocument } from './docs';
import { createContext } from './context';

export async function createServer() {
  const server = fastify({ logger: ServerConfig.dev });

  await server.register(cors);
  await server.register(ws);
  await server.register(fastifyTRPCPlugin, {
    prefix: '/trpc',
    useWss: false,
    trpcOptions: { router: appRouter, createContext },
  });
  await server.register(fastifyTRPCOpenApiPlugin, {
    basePath: ServerConfig.basePath,
    router: appRouter,
    createContext,
  } as any);

  await server.register(fastifySwagger, {
    mode: 'static',
    specification: { document: serverDocument },
    uiConfig: { displayOperationId: true },
    exposeRoute: true,
  } as any);

  await server.register(fastifySwaggerUI, {
    routePrefix: ServerConfig.docsPath,
    uiConfig: {
      docExpansion: 'full',
      deepLinking: false,
    },
    uiHooks: {
      onRequest: function (request, reply, next) {
        next();
      },
      preHandler: function (request, reply, next) {
        next();
      },
    },
    staticCSP: true,
    transformStaticCSP: (header) => header,
    transformSpecification: (swaggerObject, request, reply) => swaggerObject,
    transformSpecificationClone: true,
  });

  server.get(ServerInfoDefine.path, async (): Promise<ServerInfoOutput> => {
    const serverTime = new Date();
    const output: ServerInfoOutput = {
      name: ServerConfig.name,
      title: ServerConfig.title,
      description: ServerConfig.description,
      runtime: ServerConfig.runtime,
      version: ServerConfig.version,
      time: serverTime.toISOString(),
    };
    return output;
  });

  const stop = async () => {
    await server.close();
  };
  const start = async () => {
    try {
      const address = await server.listen({ port: ServerConfig.port });
      await server.ready();
      server.swagger();
      console.log(
        `> Listen Port: ${ServerConfig.port}\n> Server Address: ${address}\n> API Docs: http://localhost:4000/docs`
      );
    } catch (err) {
      server.log.error(err);
      process.exit(1);
    }
  };

  return { server, start, stop };
}
