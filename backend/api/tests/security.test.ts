import { describe, expect, it } from 'vitest';

import { createAccessToken, verifyAccessToken } from '../src/lib/jwt.js';
import { hashPassword, verifyPassword } from '../src/lib/password.js';
import {
  createRefreshToken,
  findRefreshSession,
  hashRefreshToken,
  issueRefreshSession,
  revokeRefreshToken,
  rotateRefreshSession,
} from '../src/lib/refreshSessions.js';

function createAuthSessionPrismaMock() {
  let counter = 0;
  const sessions: Array<Record<string, any>> = [];

  const prisma = {
    authSession: {
      async create({ data }: { data: Record<string, any> }) {
        const session = {
          id: `session_${++counter}`,
          userId: data.userId,
          refreshTokenHash: data.refreshTokenHash,
          expiresAt: data.expiresAt,
          createdAt: new Date(),
          lastSeenAt: null,
          revokedAt: null,
          userAgent: data.userAgent ?? null,
          ipAddress: data.ipAddress ?? null,
        };
        sessions.push(session);
        return structuredClone(session);
      },
      async findFirst({ where, include }: { where: Record<string, any>; include?: Record<string, boolean> }) {
        const session = sessions.find((entry) => {
          if (where.refreshTokenHash && entry.refreshTokenHash !== where.refreshTokenHash) {
            return false;
          }
          return true;
        });

        if (!session) {
          return null;
        }

        const copy = structuredClone(session);
        if (include?.user) {
          return {
            ...copy,
            user: {
              id: copy.userId,
              email: 'solver@example.com',
              username: 'solver',
            },
          };
        }
        return copy;
      },
      async update({ where, data }: { where: Record<string, any>; data: Record<string, any> }) {
        const session = sessions.find((entry) => entry.id === where.id);
        if (!session) {
          throw new Error('Session not found');
        }
        Object.assign(session, data);
        return structuredClone(session);
      },
      async updateMany({ where, data }: { where: Record<string, any>; data: Record<string, any> }) {
        let count = 0;
        for (const session of sessions) {
          if (where.id && session.id !== where.id) {
            continue;
          }
          if (where.refreshTokenHash && session.refreshTokenHash !== where.refreshTokenHash) {
            continue;
          }
          if (where.revokedAt === null && session.revokedAt !== null) {
            continue;
          }
          Object.assign(session, data);
          count += 1;
        }

        return { count };
      },
    },
    async $transaction<T>(callback: (tx: typeof prisma) => Promise<T>) {
      return callback(prisma);
    },
    __sessions: sessions,
  };

  return prisma;
}

describe('password utilities', () => {
  it('hashes and verifies passwords with argon2id', async () => {
    const passwordHash = await hashPassword('password123');

    expect(passwordHash).not.toBe('password123');
    await expect(verifyPassword(passwordHash, 'password123')).resolves.toBe(true);
    await expect(verifyPassword(passwordHash, 'wrong-password')).resolves.toBe(false);
  });
});

describe('jwt utilities', () => {
  it('creates and verifies access tokens', () => {
    const { token } = createAccessToken({
      id: 'user_1',
      email: 'solver@example.com',
      username: 'solver',
    });

    expect(verifyAccessToken(token)).toMatchObject({
      id: 'user_1',
      email: 'solver@example.com',
      username: 'solver',
      type: 'access',
    });
    expect(verifyAccessToken(`${token}broken`)).toBeNull();
  });
});

describe('refresh-session utilities', () => {
  it('creates, finds, rotates, and revokes refresh sessions', async () => {
    const prisma = createAuthSessionPrismaMock();
    const request = {
      headers: {
        'user-agent': 'vitest',
      },
      ip: '127.0.0.1',
    };

    const rawToken = createRefreshToken();
    expect(hashRefreshToken(rawToken)).toBe(hashRefreshToken(rawToken));

    const first = await issueRefreshSession(prisma as never, request as never, 'user_1');
    expect(first.rawToken).toBeTruthy();
    expect(prisma.__sessions).toHaveLength(1);

    const found = await findRefreshSession(prisma as never, first.rawToken);
    expect(found?.user.username).toBe('solver');

    const rotated = await rotateRefreshSession(prisma as never, request as never, first.session.id, 'user_1');
    expect(rotated.rawToken).not.toBe(first.rawToken);
    expect(prisma.__sessions).toHaveLength(2);
    expect(prisma.__sessions[0]?.revokedAt).toBeTruthy();

    await revokeRefreshToken(prisma as never, rotated.rawToken);
    expect(prisma.__sessions[1]?.revokedAt).toBeTruthy();
  });
});
