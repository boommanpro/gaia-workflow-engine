import type { CreateFastifyContextOptions } from '@trpc/server/adapters/fastify';

export function createContext(ctx: CreateFastifyContextOptions) {
  const { req, res } = ctx;
  return { req, res };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
