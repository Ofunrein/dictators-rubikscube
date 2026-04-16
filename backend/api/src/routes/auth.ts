import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { env } from '../config/env.js';
import { requireAccessAuth } from '../lib/auth.js';
import { sendApiError, parseInput } from '../lib/http.js';
import { createAccessToken } from '../lib/jwt.js';
import { hashPassword, verifyPassword } from '../lib/password.js';
import {
  clearRefreshTokenCookie,
  findRefreshSession,
  issueRefreshSession,
  mapSessionUser,
  normalizeEmail,
  normalizeUsername,
  revokeRefreshToken,
  rotateRefreshSession,
  setRefreshTokenCookie,
} from '../lib/refreshSessions.js';
import type { AuthTokensResponse } from '../types/contracts.js';

const registerSchema = z.object({
  email: z.string().email(),
  username: z.string().trim().min(3).max(32),
  password: z.string().min(8).max(128),
});

const loginSchema = z.object({
  identifier: z.string().trim().min(3).max(128),
  password: z.string().min(8).max(128),
});

function normalizeIdentifier(identifier: string): string {
  return identifier.trim().toLowerCase();
}

function createAuthResponse(user: { id: string; email: string; username: string }): AuthTokensResponse {
  const sessionUser = mapSessionUser(user);
  const { token, expiresIn } = createAccessToken(sessionUser);

  return {
    accessToken: token,
    expiresIn,
    user: sessionUser,
  };
}

export default async function authRoutes(app: FastifyInstance): Promise<void> {
  app.post('/register', async (request, reply) => {
    const payload = parseInput(registerSchema, request.body, reply);
    if (!payload) {
      return;
    }

    const email = normalizeEmail(payload.email);
    const username = normalizeUsername(payload.username);
    const passwordHash = await hashPassword(payload.password);

    const existing = await app.prisma.user.findFirst({
      where: {
        OR: [{ email }, { username }],
      },
    });

    if (existing?.email === email) {
      sendApiError(reply, 409, 'EMAIL_IN_USE', 'Email already in use');
      return;
    }

    if (existing?.username === username) {
      sendApiError(reply, 409, 'USERNAME_IN_USE', 'Username already in use');
      return;
    }

    const user = await app.prisma.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          email,
          username,
          lastLoginAt: new Date(),
        },
      });

      await tx.userCredential.create({
        data: {
          userId: createdUser.id,
          passwordHash,
        },
      });

      return createdUser;
    });

    const issued = await issueRefreshSession(app.prisma, request, user.id);
    setRefreshTokenCookie(reply, issued.rawToken);

    reply.code(201).send(createAuthResponse(user));
  });

  app.post('/login', async (request, reply) => {
    const payload = parseInput(loginSchema, request.body, reply);
    if (!payload) {
      return;
    }

    const identifier = normalizeIdentifier(payload.identifier);
    const user = await app.prisma.user.findFirst({
      where: {
        OR: [{ email: identifier }, { username: identifier }],
      },
      include: {
        credentials: true,
      },
    });

    if (!user || !user.credentials) {
      sendApiError(reply, 401, 'INVALID_CREDENTIALS', 'Invalid username/email or password');
      return;
    }

    const validPassword = await verifyPassword(user.credentials.passwordHash, payload.password);
    if (!validPassword) {
      sendApiError(reply, 401, 'INVALID_CREDENTIALS', 'Invalid username/email or password');
      return;
    }

    await app.prisma.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: new Date(),
      },
    });

    const issued = await issueRefreshSession(app.prisma, request, user.id);
    setRefreshTokenCookie(reply, issued.rawToken);

    reply.send(createAuthResponse(user));
  });

  app.post('/refresh', async (request, reply) => {
    const rawRefreshToken = request.cookies?.[env.REFRESH_COOKIE_NAME];
    if (!rawRefreshToken) {
      sendApiError(reply, 401, 'UNAUTHORIZED', 'Unauthorized');
      return;
    }

    const currentSession = await findRefreshSession(app.prisma, rawRefreshToken);
    if (!currentSession) {
      clearRefreshTokenCookie(reply);
      sendApiError(reply, 401, 'UNAUTHORIZED', 'Unauthorized');
      return;
    }

    const rotated = await rotateRefreshSession(app.prisma, request, currentSession.id, currentSession.userId);
    setRefreshTokenCookie(reply, rotated.rawToken);

    reply.send(createAuthResponse(currentSession.user));
  });

  app.post('/logout', async (request, reply) => {
    const rawRefreshToken = request.cookies?.[env.REFRESH_COOKIE_NAME];
    if (rawRefreshToken) {
      await revokeRefreshToken(app.prisma, rawRefreshToken);
    }

    clearRefreshTokenCookie(reply);
    reply.send({ ok: true });
  });

  app.get('/me', async (request, reply) => {
    const auth = await requireAccessAuth(app.prisma, request, reply);
    if (!auth) {
      return;
    }

    reply.send({ user: auth });
  });
}
