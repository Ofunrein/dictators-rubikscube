import { describe, expect, it } from 'vitest';

import { buildApp } from '../src/app.js';

const SOLVED_STATE = {
  U: Array(9).fill('W'),
  R: Array(9).fill('R'),
  F: Array(9).fill('G'),
  D: Array(9).fill('Y'),
  L: Array(9).fill('O'),
  B: Array(9).fill('B'),
};

function createPrismaMock() {
  let idCounter = 0;
  const db = {
    users: [] as Array<Record<string, any>>,
    userCredentials: [] as Array<Record<string, any>>,
    authSessions: [] as Array<Record<string, any>>,
    cubeSessions: [] as Array<Record<string, any>>,
    solveRecords: [] as Array<Record<string, any>>,
  };

  const now = () => new Date();
  const nextId = () => `id_${++idCounter}`;
  const clone = <T>(value: T): T => structuredClone(value);

  const prisma = {
    user: {
      async create({ data }: { data: Record<string, any> }) {
        const user = {
          id: nextId(),
          email: data.email,
          username: data.username,
          createdAt: now(),
          updatedAt: now(),
          lastLoginAt: data.lastLoginAt ?? null,
        };
        db.users.push(user);
        return clone(user);
      },
      async findUnique({ where }: { where: Record<string, any> }) {
        const user = db.users.find((entry) => {
          if (where.id) return entry.id === where.id;
          if (where.email) return entry.email === where.email;
          if (where.username) return entry.username === where.username;
          return false;
        });
        return user ? clone(user) : null;
      },
      async findFirst({ where, include }: { where: Record<string, any>; include?: Record<string, boolean> }) {
        const user = db.users.find((entry) => {
          if (where.id) return entry.id === where.id;
          if (where.userId) return entry.id === where.userId;
          if (where.OR && Array.isArray(where.OR)) {
            return where.OR.some((clause: Record<string, any>) => {
              if (clause.email) return entry.email === clause.email;
              if (clause.username) return entry.username === clause.username;
              return false;
            });
          }
          return false;
        });

        if (!user) return null;
        if (include?.credentials) {
          const credentials = db.userCredentials.find((entry) => entry.userId === user.id) ?? null;
          return clone({ ...user, credentials });
        }

        return clone(user);
      },
      async update({ where, data }: { where: Record<string, any>; data: Record<string, any> }) {
        const user = db.users.find((entry) => entry.id === where.id);
        if (!user) throw new Error('User not found');
        Object.assign(user, data, { updatedAt: now() });
        return clone(user);
      },
    },
    userCredential: {
      async create({ data }: { data: Record<string, any> }) {
        const credential = {
          userId: data.userId,
          passwordHash: data.passwordHash,
          passwordUpdatedAt: now(),
        };
        db.userCredentials.push(credential);
        return clone(credential);
      },
    },
    authSession: {
      async create({ data }: { data: Record<string, any> }) {
        const session = {
          id: nextId(),
          userId: data.userId,
          refreshTokenHash: data.refreshTokenHash,
          expiresAt: data.expiresAt,
          createdAt: now(),
          lastSeenAt: null,
          revokedAt: null,
          userAgent: data.userAgent ?? null,
          ipAddress: data.ipAddress ?? null,
        };
        db.authSessions.push(session);
        return clone(session);
      },
      async findFirst({ where, include }: { where: Record<string, any>; include?: Record<string, boolean> }) {
        const session = db.authSessions.find((entry) => {
          if (where.id && entry.id !== where.id) return false;
          if (where.refreshTokenHash && entry.refreshTokenHash !== where.refreshTokenHash) return false;
          if (where.userId && entry.userId !== where.userId) return false;
          return true;
        });

        if (!session) return null;
        if (include?.user) {
          const user = db.users.find((entry) => entry.id === session.userId);
          return clone({ ...session, user });
        }
        return clone(session);
      },
      async update({ where, data }: { where: Record<string, any>; data: Record<string, any> }) {
        const session = db.authSessions.find((entry) => entry.id === where.id);
        if (!session) throw new Error('Session not found');
        Object.assign(session, data);
        return clone(session);
      },
      async updateMany({ where, data }: { where: Record<string, any>; data: Record<string, any> }) {
        let count = 0;
        for (const session of db.authSessions) {
          if (where.id && session.id !== where.id) continue;
          if (where.refreshTokenHash && session.refreshTokenHash !== where.refreshTokenHash) continue;
          if (where.revokedAt === null && session.revokedAt !== null) continue;
          Object.assign(session, data);
          count += 1;
        }
        return { count };
      },
    },
    cubeSession: {
      async create({ data }: { data: Record<string, any> }) {
        const session = {
          id: nextId(),
          userId: data.userId,
          title: data.title ?? null,
          status: data.status ?? 'in_progress',
          cubeState: data.cubeState,
          moveHistory: data.moveHistory,
          scramble: data.scramble,
          timerMs: data.timerMs ?? 0,
          startedAt: now(),
          updatedAt: now(),
          completedAt: data.completedAt ?? null,
        };
        db.cubeSessions.push(session);
        return clone(session);
      },
      async findMany({ where, orderBy, take }: { where: Record<string, any>; orderBy?: Record<string, string>; take?: number }) {
        let sessions = db.cubeSessions.filter((entry) => {
          if (where.userId && entry.userId !== where.userId) return false;
          if (where.status && entry.status !== where.status) return false;
          return true;
        });
        if (orderBy?.updatedAt === 'desc') {
          sessions = sessions.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
        }
        return clone(sessions.slice(0, take ?? sessions.length));
      },
      async findFirst({ where }: { where: Record<string, any> }) {
        const session = db.cubeSessions.find((entry) => {
          if (where.id && entry.id !== where.id) return false;
          if (where.userId && entry.userId !== where.userId) return false;
          return true;
        });
        return session ? clone(session) : null;
      },
      async update({ where, data }: { where: Record<string, any>; data: Record<string, any> }) {
        const session = db.cubeSessions.find((entry) => entry.id === where.id);
        if (!session) throw new Error('Session not found');
        Object.assign(session, data, { updatedAt: now() });
        return clone(session);
      },
    },
    solveRecord: {
      async upsert({ where, create, update }: { where: Record<string, any>; create: Record<string, any>; update: Record<string, any> }) {
        let record = db.solveRecords.find((entry) => entry.sourceSessionId === where.sourceSessionId);
        if (!record) {
          record = {
            id: nextId(),
            userId: create.userId,
            sourceSessionId: create.sourceSessionId ?? null,
            mode: create.mode,
            durationMs: create.durationMs,
            moveCount: create.moveCount,
            scramble: create.scramble,
            solution: create.solution,
            completedAt: create.completedAt ?? now(),
          };
          db.solveRecords.push(record);
          return clone(record);
        }
        Object.assign(record, update);
        return clone(record);
      },
      async findMany({ where, orderBy, take }: { where: Record<string, any>; orderBy?: Record<string, string>; take?: number }) {
        let records = db.solveRecords.filter((entry) => entry.userId === where.userId);
        if (orderBy?.completedAt === 'desc') {
          records = records.sort((a, b) => b.completedAt.getTime() - a.completedAt.getTime());
        }
        return clone(records.slice(0, take ?? records.length));
      },
      async count({ where }: { where: Record<string, any> }) {
        return db.solveRecords.filter((entry) => entry.userId === where.userId).length;
      },
      async aggregate({ where }: { where: Record<string, any> }) {
        const records = db.solveRecords.filter((entry) => entry.userId === where.userId);
        if (records.length === 0) {
          return { _avg: { durationMs: null }, _min: { durationMs: null } };
        }
        const durations = records.map((entry) => entry.durationMs);
        const sum = durations.reduce((acc, value) => acc + value, 0);
        return {
          _avg: { durationMs: sum / durations.length },
          _min: { durationMs: Math.min(...durations) },
        };
      },
      async findFirst({ where, orderBy }: { where: Record<string, any>; orderBy?: Record<string, string> }) {
        let records = db.solveRecords.filter((entry) => entry.userId === where.userId);
        if (orderBy?.completedAt === 'desc') {
          records = records.sort((a, b) => b.completedAt.getTime() - a.completedAt.getTime());
        }
        return records[0] ? clone(records[0]) : null;
      },
    },
    async $transaction<T>(callback: (tx: typeof prisma) => Promise<T>) {
      return callback(prisma);
    },
    async $disconnect() {},
  };

  return prisma;
}

describe('auth + persistence routes', () => {
  it('supports register, login by username/email, refresh, and me', async () => {
    const prisma = createPrismaMock();
    const app = buildApp({ prisma: prisma as never, logger: false });
    await app.ready();

    const register = await app.inject({
      method: 'POST',
      url: '/v1/auth/register',
      payload: {
        email: 'solver@example.com',
        username: 'solver',
        password: 'password123',
      },
    });
    expect(register.statusCode).toBe(201);
    expect(register.json().user.username).toBe('solver');
    const refreshCookie = register.cookies.find((cookie) => cookie.name === 'refresh_token');
    expect(refreshCookie?.value).toBeTruthy();

    const meFromRegisterToken = await app.inject({
      method: 'GET',
      url: '/v1/auth/me',
      headers: {
        authorization: `Bearer ${register.json().accessToken}`,
      },
    });
    expect(meFromRegisterToken.statusCode).toBe(200);

    const loginByUsername = await app.inject({
      method: 'POST',
      url: '/v1/auth/login',
      payload: {
        identifier: 'solver',
        password: 'password123',
      },
    });
    expect(loginByUsername.statusCode).toBe(200);

    const loginByEmail = await app.inject({
      method: 'POST',
      url: '/v1/auth/login',
      payload: {
        identifier: 'solver@example.com',
        password: 'password123',
      },
    });
    expect(loginByEmail.statusCode).toBe(200);

    const loginCookie = loginByEmail.cookies.find((cookie) => cookie.name === 'refresh_token');
    const refresh = await app.inject({
      method: 'POST',
      url: '/v1/auth/refresh',
      cookies: {
        refresh_token: loginCookie?.value ?? '',
      },
    });
    expect(refresh.statusCode).toBe(200);
    expect(refresh.json().accessToken).toBeTruthy();

    const logout = await app.inject({
      method: 'POST',
      url: '/v1/auth/logout',
      cookies: {
        refresh_token: loginCookie?.value ?? '',
      },
    });
    expect(logout.statusCode).toBe(200);
    expect(logout.json().ok).toBe(true);

    await app.close();
  });

  it('persists cube sessions, solve records, and summary stats behind bearer auth', async () => {
    const prisma = createPrismaMock();
    const app = buildApp({ prisma: prisma as never, logger: false });
    await app.ready();

    const register = await app.inject({
      method: 'POST',
      url: '/v1/auth/register',
      payload: {
        email: 'speed@example.com',
        username: 'speedster',
        password: 'password123',
      },
    });

    const accessToken = register.json().accessToken as string;
    const authHeader = { authorization: `Bearer ${accessToken}` };

    const createSession = await app.inject({
      method: 'POST',
      url: '/v1/cube-sessions',
      headers: authHeader,
      payload: {
        title: 'Practice',
        status: 'in_progress',
        cubeState: SOLVED_STATE,
        moveHistory: ['R', 'U', "R'"],
        scramble: ['R', 'U'],
        timerMs: 18234,
      },
    });
    expect(createSession.statusCode).toBe(201);

    const sessionId = createSession.json().session.id as string;

    const complete = await app.inject({
      method: 'POST',
      url: `/v1/cube-sessions/${sessionId}/complete`,
      headers: authHeader,
      payload: {
        durationMs: 18234,
        moveCount: 3,
      },
    });
    expect(complete.statusCode).toBe(200);

    const history = await app.inject({
      method: 'GET',
      url: '/v1/solve-records?limit=10',
      headers: authHeader,
    });
    expect(history.statusCode).toBe(200);
    expect(history.json().solveRecords.length).toBe(1);

    const stats = await app.inject({
      method: 'GET',
      url: '/v1/stats/summary',
      headers: authHeader,
    });
    expect(stats.statusCode).toBe(200);
    expect(stats.json().summary.totalSolves).toBe(1);
    expect(stats.json().summary.bestTimeMs).toBe(18234);

    const unauthorized = await app.inject({
      method: 'GET',
      url: '/v1/stats/summary',
    });
    expect(unauthorized.statusCode).toBe(401);

    await app.close();
  });
});
