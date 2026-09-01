/**
 * app.ts — Fastify application factory
 *
 * Builds and configures the Fastify server instance without starting it.
 * Keeping the factory separate from the entry point (index.ts) makes the
 * server testable — tests can call buildApp() and inject requests without
 * binding to a real port.
 *
 * Key responsibilities:
 *   - Register plugins: cookies, CORS, rate limiting
 *   - Decorate the app with the Prisma client
 *   - Mount all API routes under /v1 and /api/v1
 *   - Set global error and not-found handlers
 *
 * CORS origins are read from environment config, not hardcoded here.
 */
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
    request.log?.error?.(error);
    if (reply.sent) {
      return;
    }

    // @fastify/rate-limit has emitted both a status-bearing Fastify error and
    // the custom response object across releases. Handle either shape so the
    // global handler never turns an intentional 429 into a 500.
    const errorObj = error as unknown as Record<string, unknown>;
    const isRateLimited = errorObj.statusCode === 429
      || (errorObj.error && typeof errorObj.error === 'object'
        && (errorObj.error as Record<string, unknown>).code === 'RATE_LIMITED');
    if (isRateLimited) {
      if (errorObj.error && typeof errorObj.error === 'object' && 'code' in errorObj.error) {
        reply.status(429).send(error);
      } else {
        sendApiError(reply, 429, 'RATE_LIMITED', 'Rate limit exceeded.');
      }
      return;
    }

    // Preserve status codes already set (e.g., from other plugins) if they're 4xx
    if (reply.statusCode >= 400 && reply.statusCode !== 500) {
      reply.send({ error: { code: String(reply.statusCode), message: (error as Error).message || 'Request error.' } });
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
