import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import type { PrismaClient } from '@prisma/client';
import Fastify, { type FastifyInstance } from 'fastify';
import { randomUUID } from 'node:crypto';

import { env, getAllowedOrigins } from './config/env.js';
import { sendApiError } from './lib/http.js';
import { prisma as defaultPrisma } from './lib/prisma.js';
import aiHelpRoutes from './routes/aiHelp.js';
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

  // Rate-limited AI routes — scoped so only /ai endpoints are throttled
  const registerRateLimitedAi = async (instance: FastifyInstance): Promise<void> => {
    await instance.register(rateLimit, {
      max: 10,
      timeWindow: '1 minute',
      keyGenerator: (request) =>
        (request.headers['x-forwarded-for'] as string)?.split(',')[0].trim() ?? request.ip,
      errorResponseBuilder: (_request, context) => ({
        error: {
          code: 'RATE_LIMITED',
          message: `Rate limit exceeded. Retry in ${Math.ceil(context.ttl / 1000)} seconds.`,
          requestId: randomUUID(),
        },
      }),
    });

    instance.register(aiHelpRoutes, { prefix: '/ai' });
  };

  app.register(registerRateLimitedAi, { prefix: '/v1' });
  app.register(registerRateLimitedAi, { prefix: '/api/v1' });

  app.setNotFoundHandler((request, reply) => {
    sendApiError(reply, 404, 'NOT_FOUND', 'Route not found.');
  });

  app.setErrorHandler((error, request, reply) => {
    request.log.error(error);
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
