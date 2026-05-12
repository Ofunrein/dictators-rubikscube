/**
 * jwt.ts — JWT access token creation and verification
 *
 * Handles the short-lived access tokens that clients include in the
 * Authorization header. Refresh tokens are managed separately in
 * lib/refreshSessions.ts.
 *
 * Key exports:
 *   - createAccessToken(user) — signs a new JWT with the user's id/email/username
 *   - verifyAccessToken(token) — validates a JWT and returns its claims, or null
 *
 * Token lifetime is controlled by env.JWT_ACCESS_TTL_MINUTES.
 * Secret is read from env.JWT_ACCESS_SECRET — never hardcoded here.
 */
import jwt from 'jsonwebtoken';

import { env } from '../config/env.js';
import type { AccessTokenClaims, SessionUser } from '../types/contracts.js';

function getAccessTokenExpirySeconds(): number {
  return env.JWT_ACCESS_TTL_MINUTES * 60;
}

export function createAccessToken(user: SessionUser): { token: string; expiresIn: number } {
  const expiresIn = getAccessTokenExpirySeconds();
  const claims: AccessTokenClaims = {
    id: user.id,
    email: user.email,
    username: user.username,
    type: 'access',
  };

  const token = jwt.sign(claims, env.JWT_ACCESS_SECRET, {
    algorithm: 'HS256',
    expiresIn,
    subject: user.id,
  });

  return { token, expiresIn };
}

export function verifyAccessToken(token: string): AccessTokenClaims | null {
  try {
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET);
    if (!decoded || typeof decoded !== 'object') {
      return null;
    }

    if (decoded.type !== 'access') {
      return null;
    }

    if (typeof decoded.id !== 'string' || typeof decoded.email !== 'string' || typeof decoded.username !== 'string') {
      return null;
    }

    return {
      id: decoded.id,
      email: decoded.email,
      username: decoded.username,
      type: 'access',
    };
  } catch {
    return null;
  }
}
