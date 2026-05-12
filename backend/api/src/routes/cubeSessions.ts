import { CubeSessionStatus } from '@prisma/client';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { requireAccessAuth } from '../lib/auth.js';
import { parseInput, sendApiError } from '../lib/http.js';

// Each face is exactly 9 stickers; enforcing length here prevents silent data truncation later
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
  // Default to in_progress so the client can omit status and start solving immediately
  status: z.enum(['in_progress', 'completed', 'abandoned']).default('in_progress'),
  cubeState: cubeStateSchema,
  // 5000-move cap prevents pathological payloads from bloating the DB column
  moveHistory: z.array(z.string()).max(5000).default([]),
  // Scramble is short (typically ≤25 moves) but capped at 400 for non-standard puzzle types
  scramble: z.array(z.string()).max(400).default([]),
  // 12h ceiling covers any conceivable live session including paused / multi-attempt
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
  // Refuse an empty PATCH body early; otherwise Prisma would issue an UPDATE that changes nothing
  .refine((payload) => Object.keys(payload).length > 0, {
    message: 'At least one field must be updated',
  });

const listQuerySchema = z.object({
  status: z.enum(['in_progress', 'completed', 'abandoned']).optional(),
  // Default 25 keeps response size predictable; cap at 100 to avoid accidental full-table returns
  limit: z.coerce.number().int().min(1).max(100).default(25),
});

const idParamsSchema = z.object({
  id: z.string().min(1),
});

const completeSchema = z.object({
  durationMs: z.coerce.number().int().min(0).optional(),
  moveCount: z.coerce.number().int().min(0).optional(),
  mode: z.string().trim().min(2).max(40).default('practice'),
  // solution is optional; falls back to the session's moveHistory when omitted
  solution: z.array(z.string()).max(10000).optional(),
});

// Bridge between the string enum the API accepts and the Prisma enum stored in the DB
function toStatus(status: 'in_progress' | 'completed' | 'abandoned'): CubeSessionStatus {
  if (status === 'completed') {
    return CubeSessionStatus.completed;
  }
  if (status === 'abandoned') {
    return CubeSessionStatus.abandoned;
  }
  return CubeSessionStatus.in_progress;
}

// Dates must be serialized as ISO strings for consistent cross-timezone parsing by clients
function toIsoString(value: Date | null): string | null {
  return value ? value.toISOString() : null;
}

// Prisma returns JSON columns as `unknown`; this safely coerces to string[] without crashing on nulls
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
        // Always filter by userId so users can never see each other's sessions
        userId: auth.id,
        // Omitting status returns all states; filtering lets the UI render separate in-progress / history tabs
        status: query.status ? toStatus(query.status) : undefined,
      },
      // Most-recently-touched first so the active session appears at the top of the list
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
        // Bind to the authenticated user at write time; never trust a userId from the request body
        userId: auth.id,
        title: payload.title ?? null,
        status: toStatus(payload.status),
        cubeState: payload.cubeState,
        moveHistory: payload.moveHistory,
        scramble: payload.scramble,
        timerMs: payload.timerMs,
      },
    });

    // 201 Created signals that a new resource was produced, not just a successful action
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

    // Include userId in the WHERE clause so a user can't read another user's session by guessing an ID
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

    // Fetch first to confirm ownership before issuing the UPDATE; prevents IDOR via crafted IDs
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
      // Use the DB-confirmed id, not params.id, to prevent any injection via URL manipulation
      where: { id: existing.id },
      data: {
        title: payload.title,
        status: payload.status ? toStatus(payload.status) : undefined,
        cubeState: payload.cubeState,
        moveHistory: payload.moveHistory,
        scramble: payload.scramble,
        timerMs: payload.timerMs,
        // Set completedAt exactly once when status transitions to completed; never overwrite an existing timestamp
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

    // request.body may be undefined when Content-Type is absent; default to {} so zod doesn't throw
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

    // Prisma returns JSON columns as `unknown`; normalize before using array methods
    const moveHistory = normalizeStringArray(session.moveHistory);
    const scramble = normalizeStringArray(session.scramble);
    // If the client doesn't send a custom solution, the full move history is the implicit solution
    const solution = payload.solution ?? moveHistory;
    // Allow client to override timer (e.g. paused time) but fall back to what the session tracked
    const durationMs = payload.durationMs ?? session.timerMs;
    // moveCount may differ from moveHistory.length if the client optimized or annotated moves
    const moveCount = payload.moveCount ?? moveHistory.length;
    // Capture once so session.completedAt and solveRecord.completedAt are identical timestamps
    const completedAt = new Date();

    // Transaction ensures the session and solve record are always consistent —
    // a partial write would leave orphaned or mismatched records
    const result = await app.prisma.$transaction(async (tx) => {
      const updatedSession = await tx.cubeSession.update({
        where: { id: session.id },
        data: {
          status: CubeSessionStatus.completed,
          timerMs: durationMs,
          completedAt,
        },
      });

      // Upsert instead of create so re-completing a session (e.g. bug retry) updates rather than duplicates
      // sourceSessionId is the unique key: one solve record per session, enforced at the DB level
      const solveRecord = await tx.solveRecord.upsert({
        where: {
          sourceSessionId: session.id,
        },
        create: {
          userId: auth.id,
          // Link to the session so we can reconstruct the full move history and cube state for replay
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
