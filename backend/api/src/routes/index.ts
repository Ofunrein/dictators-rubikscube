import type { FastifyInstance } from 'fastify';

import authRoutes from './auth.js';
import cubeRoutes from './cube.js';
import cubeSessionRoutes from './cubeSessions.js';
import solveRecordRoutes from './solveRecords.js';
import statsRoutes from './stats.js';

export default async function registerRoutes(app: FastifyInstance): Promise<void> {
  app.get('/health', async () => ({
    ok: true,
    service: 'rubiks-api',
    version: '0.2.0',
    timestamp: new Date().toISOString(),
  }));

  app.register(authRoutes, { prefix: '/auth' });
  app.register(cubeRoutes, { prefix: '/cube' });
  app.register(cubeSessionRoutes, { prefix: '/cube-sessions' });
  app.register(solveRecordRoutes, { prefix: '/solve-records' });
  app.register(statsRoutes, { prefix: '/stats' });
}
