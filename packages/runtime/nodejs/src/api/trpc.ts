import { OpenApiMeta } from 'trpc-openapi';
import { initTRPC } from '@trpc/server';

import type { Context } from '../server/context';

const t = initTRPC
  .context<Context>()
  .meta<OpenApiMeta>()
  .create({
    errorFormatter({ shape }) {
      return shape;
    },
  });

export const router = t.router;
export const publicProcedure = t.procedure;
