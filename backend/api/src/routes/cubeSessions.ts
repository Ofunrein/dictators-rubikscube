import { CubeSessionStatus } from '@prisma/client';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { requireAccessAuth } from '../lib/auth.js';
import { parseInput, sendApiError } from '../lib/http.js';

const cubeStateSchema = z.object({
  U: z.array(z.string()).length(9),
  R: z.array(z.string()).length(9),
  F: z.array(z.string()).length(9),
  D: z.array(z.string()).length(9),
  L: z.array(z.string()).length(9),
  B: z.array(z.string()).length(9),
});

const createSessionSchema = z.object({
  title: z.string().trim().min(1).max(80).nullable().optional(),
  status: z.enum(['in_progress', 'completed', 'abandoned']).default('in_progress'),
  cubeState: cubeStateSchema,
  moveHistory: z.array(z.string()).max(5000).default([]),
  scramble: z.array(z.string()).max(400).default([]),
  timerMs: z.coerce.number().int().min(0).max(12 * 60 * 60 * 1000).default(0),
});

const updateSessionSchema = z
  .object({
    title: z.string().trim().min(1).max(80).nullable().optional(),
    status: z.enum(['in_progress', 'completed', 'abandoned']).optional(),
    cubeState: cubeStateSchema.optional(),
    moveHistory: z.array(z.string()).max(5000).optional(),
    scramble: z.array(z.string()).max(400).optional(),
    timerMs: z.coerce.number().int().min(0).max(12 * 60 * 60 * 1000).optional(),
  })
  .refine((payload) => Object.keys(payload).length > 0, {
    message: 'At least one field must be updated',
  });

const listQuerySchema = z.object({
  status: z.enum(['in_progress', 'completed', 'abandoned']).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});

const idParamsSchema = z.object({
  id: z.string().min(1),
});

const completeSchema = z.object({
  durationMs: z.coerce.number().int().min(0).optional(),
  moveCount: z.coerce.number().int().min(0).optional(),
  mode: z.string().trim().min(2).max(40).default('practice'),
  solution: z.array(z.string()).max(10000).optional(),
});

function toStatus(status: 'in_progress' | 'completed' | 'abandoned'): CubeSessionStatus {
  if (status === 'completed') {
    return CubeSessionStatus.completed;
  }
  if (status === 'abandoned') {
    return CubeSessionStatus.abandoned;
  }
  return CubeSessionStatus.in_progress;
}

function toIsoString(value: Date | null): string | null {
  return value ? value.toISOString() : null;
}

function normalizeStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map((item) => String(item)) : [];
}

export default async function cubeSessionRoutes(app: FastifyInstance): Promise<void> {
  app.get('/', async (request, reply) => {
    const auth = await requireAccessAuth(app.prisma, request, reply);
    if (!auth) {
      return;
    }

    const query = parseInput(listQuerySchema, request.query, reply);
    if (!query) {
      return;
    }

    const sessions = await app.prisma.cubeSession.findMany({
      where: {
        userId: auth.id,
        status: query.status ? toStatus(query.status) : undefined,
      },
      orderBy: { updatedAt: 'desc' },
      take: query.limit,
    });

    reply.send({
      sessions: sessions.map((session) => ({
        id: session.id,
        title: session.title,
        status: session.status,
        cubeState: session.cubeState,
        moveHistory: session.moveHistory,
        scramble: session.scramble,
        timerMs: session.timerMs,
        startedAt: session.startedAt.toISOString(),
        updatedAt: session.updatedAt.toISOString(),
        completedAt: toIsoString(session.completedAt),
      })),
    });
  });

  app.post('/', async (request, reply) => {
    const auth = await requireAccessAuth(app.prisma, request, reply);
    if (!auth) {
      return;
    }

    const payload = parseInput(createSessionSchema, request.body, reply);
    if (!payload) {
      return;
    }

    const session = await app.prisma.cubeSession.create({
      data: {
        userId: auth.id,
        title: payload.title ?? null,
        status: toStatus(payload.status),
        cubeState: payload.cubeState,
        moveHistory: payload.moveHistory,
        scramble: payload.scramble,
        timerMs: payload.timerMs,
      },
    });

    reply.code(201).send({
      session: {
        id: session.id,
        title: session.title,
        status: session.status,
        cubeState: session.cubeState,
        moveHistory: session.moveHistory,
        scramble: session.scramble,
        timerMs: session.timerMs,
        startedAt: session.startedAt.toISOString(),
        updatedAt: session.updatedAt.toISOString(),
        completedAt: toIsoString(session.completedAt),
      },
    });
  });

  app.get('/:id', async (request, reply) => {
    const auth = await requireAccessAuth(app.prisma, request, reply);
    if (!auth) {
      return;
    }

    const params = parseInput(idParamsSchema, request.params, reply);
    if (!params) {
      return;
    }

    const session = await app.prisma.cubeSession.findFirst({
      where: {
        id: params.id,
        userId: auth.id,
      },
    });

    if (!session) {
      sendApiError(reply, 404, 'NOT_FOUND', 'Session not found');
      return;
    }

    reply.send({
      session: {
        id: session.id,
        title: session.title,
        status: session.status,
        cubeState: session.cubeState,
        moveHistory: session.moveHistory,
        scramble: session.scramble,
        timerMs: session.timerMs,
        startedAt: session.startedAt.toISOString(),
        updatedAt: session.updatedAt.toISOString(),
        completedAt: toIsoString(session.completedAt),
      },
    });
  });

  app.patch('/:id', async (request, reply) => {
    const auth = await requireAccessAuth(app.prisma, request, reply);
    if (!auth) {
      return;
    }

    const params = parseInput(idParamsSchema, request.params, reply);
    if (!params) {
      return;
    }

    const payload = parseInput(updateSessionSchema, request.body, reply);
    if (!payload) {
      return;
    }

    const existing = await app.prisma.cubeSession.findFirst({
      where: {
        id: params.id,
        userId: auth.id,
      },
    });

    if (!existing) {
      sendApiError(reply, 404, 'NOT_FOUND', 'Session not found');
      return;
    }

    const session = await app.prisma.cubeSession.update({
      where: { id: existing.id },
      data: {
        title: payload.title,
        status: payload.status ? toStatus(payload.status) : undefined,
        cubeState: payload.cubeState,
        moveHistory: payload.moveHistory,
        scramble: payload.scramble,
        timerMs: payload.timerMs,
        completedAt: payload.status === 'completed' ? new Date() : existing.completedAt,
      },
    });

    reply.send({
      session: {
        id: session.id,
        title: session.title,
        status: session.status,
        cubeState: session.cubeState,
        moveHistory: session.moveHistory,
        scramble: session.scramble,
        timerMs: session.timerMs,
        startedAt: session.startedAt.toISOString(),
        updatedAt: session.updatedAt.toISOString(),
        completedAt: toIsoString(session.completedAt),
      },
    });
  });

  app.post('/:id/complete', async (request, reply) => {
    const auth = await requireAccessAuth(app.prisma, request, reply);
    if (!auth) {
      return;
    }

    const params = parseInput(idParamsSchema, request.params, reply);
    if (!params) {
      return;
    }

    const payload = parseInput(completeSchema, request.body ?? {}, reply);
    if (!payload) {
      return;
    }

    const session = await app.prisma.cubeSession.findFirst({
      where: {
        id: params.id,
        userId: auth.id,
      },
    });

    if (!session) {
      sendApiError(reply, 404, 'NOT_FOUND', 'Session not found');
      return;
    }

    const moveHistory = normalizeStringArray(session.moveHistory);
    const scramble = normalizeStringArray(session.scramble);
    const solution = payload.solution ?? moveHistory;
    const durationMs = payload.durationMs ?? session.timerMs;
    const moveCount = payload.moveCount ?? moveHistory.length;
    const completedAt = new Date();

    const result = await app.prisma.$transaction(async (tx) => {
      const updatedSession = await tx.cubeSession.update({
        where: { id: session.id },
        data: {
          status: CubeSessionStatus.completed,
          timerMs: durationMs,
          completedAt,
        },
      });

      const solveRecord = await tx.solveRecord.upsert({
        where: {
          sourceSessionId: session.id,
        },
        create: {
          userId: auth.id,
          sourceSessionId: session.id,
          mode: payload.mode,
          durationMs,
          moveCount,
          scramble,
          solution,
          completedAt,
        },
        update: {
          mode: payload.mode,
          durationMs,
          moveCount,
          scramble,
          solution,
          completedAt,
        },
      });

      return { updatedSession, solveRecord };
    });

    reply.send({
      session: {
        id: result.updatedSession.id,
        title: result.updatedSession.title,
        status: result.updatedSession.status,
        cubeState: result.updatedSession.cubeState,
        moveHistory: result.updatedSession.moveHistory,
        scramble: result.updatedSession.scramble,
        timerMs: result.updatedSession.timerMs,
        startedAt: result.updatedSession.startedAt.toISOString(),
        updatedAt: result.updatedSession.updatedAt.toISOString(),
        completedAt: toIsoString(result.updatedSession.completedAt),
      },
      solveRecord: {
        id: result.solveRecord.id,
        sourceSessionId: result.solveRecord.sourceSessionId,
        mode: result.solveRecord.mode,
        durationMs: result.solveRecord.durationMs,
        moveCount: result.solveRecord.moveCount,
        scramble: result.solveRecord.scramble,
        solution: result.solveRecord.solution,
        completedAt: result.solveRecord.completedAt.toISOString(),
      },
    });
  });
}
