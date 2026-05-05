import type { PrismaClient } from '@prisma/client';
import type { SessionUser } from './contracts.js';

declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient;
  }

  interface FastifyRequest {
    authUser?: SessionUser;
  }
}
