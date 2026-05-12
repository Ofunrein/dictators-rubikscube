import crypto from 'node:crypto';

import type { AuthSession, PrismaClient, User } from '@prisma/client';
import type { CookieSerializeOptions } from '@fastify/cookie';
import type { FastifyReply, FastifyRequest } from 'fastify';

import { env } from '../config/env.js';
import type { SessionUser } from '../types/contracts.js';

// 48 bytes → 64-char base64url string; long enough that brute-forcing is computationally impossible
const REFRESH_TOKEN_BYTES = 48;

function getRefreshTokenTtlMs(): number {
  // Convert days → ms so we can add it directly to Date.now(), which is always in milliseconds
  return env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000;
}

function getClientIp(request: FastifyRequest): string | null {
  // Behind a reverse proxy (Nginx, Vercel, Cloudflare) the real IP is in X-Forwarded-For, not request.ip
  const forwarded = request.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    // X-Forwarded-For can be a comma-separated chain of proxies; leftmost is the original client
    return forwarded.split(',')[0]?.trim() ?? null;
  }

  return request.ip ?? null;
}

function refreshCookieOptions(): CookieSerializeOptions {
  return {
    path: '/',
    // httpOnly blocks JavaScript from reading the cookie, preventing XSS token theft
    httpOnly: true,
    // 'lax' lets the cookie travel on top-level navigations (e.g. OAuth redirects) but blocks cross-site AJAX
    sameSite: 'lax',
    // Only send over HTTPS in production; allows HTTP in local dev without extra setup
    secure: env.NODE_ENV === 'production',
    // maxAge is in seconds for Set-Cookie header, so divide the ms TTL by 1000 via the days formula
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
  // crypto.randomBytes is cryptographically secure; Math.random() must never be used for auth tokens
  return crypto.randomBytes(REFRESH_TOKEN_BYTES).toString('base64url');
}

export function hashRefreshToken(token: string): string {
  // Store only the hash in the DB so a database leak doesn't expose usable tokens
  // SHA-256 is fine here because the token is already high-entropy random data, not a password
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function mapSessionUser(user: Pick<User, 'id' | 'email' | 'username'>): SessionUser {
  // Strip everything except what the access token actually needs; avoids accidentally leaking password hash etc.
  return {
    id: user.id,
    email: user.email,
    username: user.username,
  };
}

export function isRefreshSessionValid(session: AuthSession): boolean {
  // revokedAt being set means the session was explicitly killed (logout, rotation, admin revoke)
  if (session.revokedAt) {
    return false;
  }

  // Compare epoch ms so time-zone differences can't cause false positives
  return session.expiresAt.getTime() > Date.now();
}

export function setRefreshTokenCookie(reply: FastifyReply, token: string): void {
  reply.setCookie(env.REFRESH_COOKIE_NAME, token, refreshCookieOptions());
}

export function clearRefreshTokenCookie(reply: FastifyReply): void {
  // path/sameSite/secure must match the original Set-Cookie or some browsers will refuse to clear it
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
  // Only the hash goes into the DB; rawToken is sent to the client once and never stored
  const refreshTokenHash = hashRefreshToken(rawToken);
  // Compute absolute expiry at issue time so clock drift on future requests doesn't matter
  const expiresAt = new Date(Date.now() + getRefreshTokenTtlMs());

  const session = await prisma.authSession.create({
    data: {
      userId,
      refreshTokenHash,
      expiresAt,
      // userAgent and ipAddress are stored for the user's "active sessions" view and anomaly detection
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
  // Hash before querying; the DB never sees the raw token
  const refreshTokenHash = hashRefreshToken(rawToken);
  const session = await prisma.authSession.findFirst({
    where: {
      refreshTokenHash,
    },
    include: {
      // Fetch the user in the same query to avoid an extra round-trip on every token refresh
      user: true,
    },
  });

  // Validate after fetch so we don't branch the query on revocation status — avoids timing side-channels
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
  // Wrap revoke + create in a transaction: if issuing the new token fails, the old one stays valid
  return prisma.$transaction(async (tx) => {
    // Revoke the old session before issuing the new one — token rotation prevents replay attacks
    // where a stolen token could be used indefinitely by an attacker even after the user re-authenticates
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
      // Guard against double-revoke; updateMany is idempotent but this keeps the revokedAt timestamp meaningful
      revokedAt: null,
    },
    data: {
      revokedAt: new Date(),
    },
  });
}

export async function revokeRefreshToken(prisma: PrismaClient, rawToken: string): Promise<void> {
  // Used when we have the cookie value but not the session ID (e.g. logout from current device)
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
