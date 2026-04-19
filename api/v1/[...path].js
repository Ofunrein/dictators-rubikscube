/**
 * [...path].js — Production API handler (Vercel serverless function)
 *
 * This is a thin adapter that delegates to routes.js, which is the single
 * source of truth for all endpoint logic. The local dev server (server.js)
 * uses the same ROUTES table.
 *
 * Why a separate file? Vercel's serverless functions use a different
 * request/response format than Node's raw http module:
 *   - req.body is pre-parsed JSON (no stream reading needed)
 *   - res uses .status(code).json(payload) instead of writeHead + end
 *
 * This adapter bridges that gap so all the real logic stays in routes.js.
 */

import { ROUTES } from '../../../backend/api/src/routes.js';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'content-type',
};

export default async function handler(req, res) {
  Object.entries(CORS_HEADERS).forEach(([k, v]) => res.setHeader(k, v));

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host}`);
  const routePath = url.pathname.replace(/^\/api/, '');

  const route = ROUTES.find(
    (r) => r.method === req.method && r.path === routePath,
  );

  if (!route) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Route not found.' } });
    return;
  }

  const ctx = {
    url,
    requestId: req.headers['x-vercel-id'] || 'unknown',
    sendJson: (code, payload) => res.status(code).json(payload),
    sendError: (code, errCode, message, details) => {
      const error = { code: errCode, message };
      if (details && details.length > 0) error.details = details;
      res.status(code).json({ error });
    },
  };

  const body = req.body || {};

  try {
    await route.handler(body, ctx);
  } catch (err) {
    ctx.sendError(500, 'INTERNAL_ERROR', err instanceof Error ? err.message : 'Unexpected error.');
  }
}
