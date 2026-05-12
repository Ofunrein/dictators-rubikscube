/**
 * routes/solveRecords.ts — CRUD routes for solve records
 *
 * Stores and retrieves individual solve attempts so users can track their
 * history over time. Each record captures the cube size, duration, and
 * whether the solve was completed.
 *
 * Key routes:
 *   GET  /solve-records       — list the authenticated user's recent solves
 *   POST /solve-records       — save a new solve result after completing a solve
 *   DELETE /solve-records/:id — remove a single solve record
 */
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { requireAccessAuth } from '../lib/auth.js';
import { parseInput } from '../lib/http.js';

const listQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export default async function solveRecordRoutes(app: FastifyInstance): Promise<void> {
  app.get('/', async (request, reply) => {
    const auth = await requireAccessAuth(app.prisma, request, reply);
    if (!auth) {
      return;
    }

    const query = parseInput(listQuerySchema, request.query, reply);
    if (!query) {
      return;
    }

    const records = await app.prisma.solveRecord.findMany({
      where: {
        userId: auth.id,
      },
      orderBy: {
        completedAt: 'desc',
      },
      take: query.limit,
    });

    reply.send({
      solveRecords: records.map((record) => ({
        id: record.id,
        sourceSessionId: record.sourceSessionId,
        mode: record.mode,
        durationMs: record.durationMs,
        moveCount: record.moveCount,
        scramble: record.scramble,
        solution: record.solution,
        completedAt: record.completedAt.toISOString(),
      })),
    });
  });
}
