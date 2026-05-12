/**
 * routes/stats.ts — Per-user solve statistics endpoint
 *
 * Returns aggregate stats for the authenticated user: total solve count,
 * average solve time, personal best, and when they last solved. Used by the
 * profile page to display performance over time.
 *
 * Key routes:
 *   GET /stats/summary — returns { totalSolves, avgMs, bestMs, lastSolvedAt }
 *     for the current user (requires access token)
 */
import type { FastifyInstance } from 'fastify';

import { requireAccessAuth } from '../lib/auth.js';

export default async function statsRoutes(app: FastifyInstance): Promise<void> {
  app.get('/summary', async (request, reply) => {
    const auth = await requireAccessAuth(app.prisma, request, reply);
    if (!auth) {
      return;
    }

    const [totalSolves, aggregate, lastSolve] = await Promise.all([
      app.prisma.solveRecord.count({ where: { userId: auth.id } }),
      app.prisma.solveRecord.aggregate({
        where: { userId: auth.id },
        _avg: { durationMs: true },
        _min: { durationMs: true },
      }),
      app.prisma.solveRecord.findFirst({
        where: { userId: auth.id },
        orderBy: { completedAt: 'desc' },
      }),
    ]);

    reply.send({
      summary: {
        totalSolves,
        bestTimeMs: aggregate._min.durationMs ?? null,
        averageTimeMs: aggregate._avg.durationMs !== null ? Math.round(aggregate._avg.durationMs) : null,
        lastSolveAt: lastSolve ? lastSolve.completedAt.toISOString() : null,
      },
    });
  });
}
