import crypto from 'node:crypto';

import type { AuthSession, PrismaClient, User } from '@prisma/client';
import type { CookieSerializeOptions } from '@fastify/cookie';
import type { FastifyReply, FastifyRequest } from 'fastify';

import { env } from '../config/env.js';
import type { SessionUser } from '../types/contracts.js';

const REFRESH_TOKEN_BYTES = 48;

function getRefreshTokenTtlMs(): number {
  return env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000;
}

function getClientIp(request: FastifyRequest): string | null {
  const forwarded = request.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0]?.trim() ?? null;
  }

  return request.ip ?? null;
}

function refreshCookieOptions(): CookieSerializeOptions {
  return {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: env.NODE_ENV === 'production',
    maxAge: env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60,
  };
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function normalizeUsername(username: string): string {
  return username.trim().toLowerCase();
}

export function createRefreshToken(): string {
  return crypto.randomBytes(REFRESH_TOKEN_BYTES).toString('base64url');
}

export function hashRefreshToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function mapSessionUser(user: Pick<User, 'id' | 'email' | 'username'>): SessionUser {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
  };
}

export function isRefreshSessionValid(session: AuthSession): boolean {
  if (session.revokedAt) {
    return false;
  }

  return session.expiresAt.getTime() > Date.now();
}

export function setRefreshTokenCookie(reply: FastifyReply, token: string): void {
  reply.setCookie(env.REFRESH_COOKIE_NAME, token, refreshCookieOptions());
}

export function clearRefreshTokenCookie(reply: FastifyReply): void {
  reply.clearCookie(env.REFRESH_COOKIE_NAME, {
    path: '/',
    sameSite: 'lax',
    secure: env.NODE_ENV === 'production',
  });
}

export async function issueRefreshSession(
  prisma: PrismaClient,
  request: FastifyRequest,
  userId: string,
): Promise<{ rawToken: string; session: AuthSession }> {
  const rawToken = createRefreshToken();
  const refreshTokenHash = hashRefreshToken(rawToken);
  const expiresAt = new Date(Date.now() + getRefreshTokenTtlMs());

  const session = await prisma.authSession.create({
    data: {
      userId,
      refreshTokenHash,
      expiresAt,
      userAgent: request.headers['user-agent'] ?? null,
      ipAddress: getClientIp(request),
    },
  });

  return { rawToken, session };
}

export async function findRefreshSession(
  prisma: PrismaClient,
  rawToken: string,
): Promise<(AuthSession & { user: User }) | null> {
  const refreshTokenHash = hashRefreshToken(rawToken);
  const session = await prisma.authSession.findFirst({
    where: {
      refreshTokenHash,
    },
    include: {
      user: true,
    },
  });

  if (!session || !isRefreshSessionValid(session)) {
    return null;
  }

  return session;
}

export async function rotateRefreshSession(
  prisma: PrismaClient,
  request: FastifyRequest,
  currentSessionId: string,
  userId: string,
): Promise<{ rawToken: string; session: AuthSession }> {
  return prisma.$transaction(async (tx) => {
    await tx.authSession.update({
      where: { id: currentSessionId },
      data: {
        revokedAt: new Date(),
      },
    });

    return issueRefreshSession(tx as PrismaClient, request, userId);
  });
}

export async function revokeRefreshSession(prisma: PrismaClient, sessionId: string): Promise<void> {
  await prisma.authSession.updateMany({
    where: {
      id: sessionId,
      revokedAt: null,
    },
    data: {
      revokedAt: new Date(),
    },
  });
}

export async function revokeRefreshToken(prisma: PrismaClient, rawToken: string): Promise<void> {
  const refreshTokenHash = hashRefreshToken(rawToken);
  await prisma.authSession.updateMany({
    where: {
      refreshTokenHash,
      revokedAt: null,
    },
    data: {
      revokedAt: new Date(),
    },
  });
}
