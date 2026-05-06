import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import type { PrismaClient } from '@prisma/client';
import Fastify from 'fastify';

import { env, getAllowedOrigins } from './config/env.js';
import { sendApiError } from './lib/http.js';
import { prisma as defaultPrisma } from './lib/prisma.js';
import registerRoutes from './routes/index.js';

interface BuildAppOptions {
  prisma?: PrismaClient;
  logger?: boolean;
}

export function buildApp(options: BuildAppOptions = {}) {
  const app = Fastify({ logger: options.logger ?? true });
  const prisma = options.prisma ?? defaultPrisma;
  const shouldDisconnectPrisma = !options.prisma;

  app.decorate('prisma', prisma);

  app.register(cookie, {
    hook: 'onRequest',
  });

  app.register(cors, {
    credentials: true,
    origin: (origin, callback) => {
      if (!origin) {
        callback(null, true);
        return;
      }

      if (getAllowedOrigins().includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error(`Origin not allowed by CORS: ${origin}`), false);
    },
  });

  app.register(registerRoutes, { prefix: '/v1' });
  app.register(registerRoutes, { prefix: '/api/v1' });

  app.setNotFoundHandler((request, reply) => {
    sendApiError(reply, 404, 'NOT_FOUND', 'Route not found.');
  });

  app.setErrorHandler((error, request, reply) => {
    request.log?.error?.(error);
    if (reply.sent) {
      return;
    }

    sendApiError(reply, 500, 'INTERNAL_ERROR', 'Unexpected server error.');
  });

  app.addHook('onClose', async () => {
    if (shouldDisconnectPrisma) {
      await prisma.$disconnect();
    }
  });

  return app;
}
