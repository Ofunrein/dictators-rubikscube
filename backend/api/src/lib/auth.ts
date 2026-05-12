/**
 * auth.ts — Request authentication helpers for Fastify routes
 *
 * Extracts and validates JWT access tokens from incoming HTTP requests so that
 * route handlers don't need to duplicate token-parsing logic.
 *
 * Key exports:
 *   - getAccessAuthUser(prisma, request) — returns the authenticated user or null
 *   - requireAccessAuth(prisma, request, reply) — same, but sends 401 and returns null
 *     if the token is missing or invalid (use this in protected routes)
 *
 * Does NOT issue tokens — see jwt.ts and routes/auth.ts for that.
 * Does NOT handle refresh tokens — see lib/refreshSessions.ts.
 */
import type { PrismaClient } from '@prisma/client';
import type { FastifyReply, FastifyRequest } from 'fastify';

import { sendApiError } from './http.js';
import { verifyAccessToken } from './jwt.js';
import { mapSessionUser } from './refreshSessions.js';
import type { SessionUser } from '../types/contracts.js';

function extractBearerToken(request: FastifyRequest): string | null {
  const header = request.headers.authorization;
  if (!header) {
    return null;
  }

  const [scheme, token] = header.split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !token) {
    return null;
  }

  return token;
}

export async function getAccessAuthUser(prisma: PrismaClient, request: FastifyRequest): Promise<SessionUser | null> {
  const token = extractBearerToken(request);
  if (!token) {
    return null;
  }

  const claims = verifyAccessToken(token);
  if (!claims) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: claims.id },
  });

  if (!user) {
    return null;
  }

  return mapSessionUser(user);
}

export async function requireAccessAuth(
  prisma: PrismaClient,
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<SessionUser | null> {
  const user = await getAccessAuthUser(prisma, request);
  if (!user) {
    sendApiError(reply, 401, 'UNAUTHORIZED', 'Unauthorized');
    return null;
  }

  request.authUser = user;
  return user;
}
