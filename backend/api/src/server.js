/**
 * server.js — Local development API server (slim dispatcher)
 *
 * This is the backend that runs during local development (npm run dev).
 * It handles HTTP infrastructure: CORS, body parsing, and routing.
 *
 * The actual route handlers live in routes.js — each endpoint is a named
 * function over there. This file just matches the incoming request to the
 * right handler and passes it a context object for sending responses.
 *
 * How it works with the frontend:
 *   The frontend (Vite) runs on port 5400. When the browser calls /api/v1/*,
 *   Vite proxies those requests to this server on 5200. That way the browser
 *   only talks to one port, but the API runs separately.
 *
 * In production (Vercel), the same route handlers are used by api/v1/[...path].js.
 */

import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { ROUTES } from './routes.js';

const PORT = Number(process.env.API_PORT ?? 5200);
const MAX_BODY_BYTES = 1_000_000;

// CORS headers let the frontend (on a different port) call this API.
// Without these, the browser would block cross-origin requests.
function withCorsHeaders(headers = {}) {
  return {
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET,POST,OPTIONS',
    'access-control-allow-headers': 'content-type',
    ...headers,
  };
}

function sendJson(res, statusCode, payload, headers = {}) {
  const body = JSON.stringify(payload);
  res.writeHead(
    statusCode,
    withCorsHeaders({
      'content-type': 'application/json; charset=utf-8',
      'content-length': Buffer.byteLength(body),
      ...headers,
    }),
  );
  res.end(body);
}

function sendNoContent(res) {
  res.writeHead(204, withCorsHeaders());
  res.end();
}

function sendError(res, statusCode, requestId, code, message, details) {
  const error = { code, message, requestId };
  if (details && details.length > 0) {
    error.details = details;
  }
  sendJson(res, statusCode, { error });
}

// Reads the raw JSON body from the request stream.
// Node's built-in http module doesn't parse bodies automatically (unlike Express),
// so we have to collect chunks manually. Also enforces a 1MB size limit to prevent
// someone from sending a huge payload and crashing the server.
async function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    if (req.method === 'GET' || req.method === 'HEAD') {
      resolve({});
      return;
    }

    let size = 0;
    const chunks = [];

    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(new Error('Payload too large.'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });

    req.on('end', () => {
      if (chunks.length === 0) {
        resolve({});
        return;
      }

      try {
        const raw = Buffer.concat(chunks).toString('utf-8');
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error('Invalid JSON body.'));
      }
    });

    req.on('error', () => {
      reject(new Error('Failed to read request body.'));
    });
  });
}

// The main request handler — matches the incoming request to a route and calls it.
// The route table lives in routes.js so adding a new endpoint doesn't mean
// touching this dispatch logic at all.
async function handleRequest(req, res) {
  const requestId = randomUUID();

  if (req.method === 'OPTIONS') {
    sendNoContent(res);
    return;
  }

  if (!req.url) {
    sendError(res, 400, requestId, 'BAD_REQUEST', 'Request URL is missing.');
    return;
  }

  const url = new URL(req.url, 'http://localhost');
  const { pathname } = url;

  // Normalize the path so both /v1/* and /api/v1/* work the same way.
  // The frontend proxy sends /api/v1/*, but direct API calls use /v1/*.
  const routePath = pathname.startsWith('/api/v1') ? pathname.replace(/^\/api/, '') : pathname;

  // Find the matching route in the ROUTES table from routes.js.
  const route = ROUTES.find((r) => r.method === req.method && r.path === routePath);
  if (!route) {
    sendError(res, 404, requestId, 'NOT_FOUND', 'Route not found.');
    return;
  }

  // Parse the request body for POST routes.
  let body = {};
  if (req.method === 'POST') {
    try {
      body = await readJsonBody(req);
    } catch (error) {
      sendError(res, 400, requestId, 'BAD_REQUEST', error.message);
      return;
    }
  }

  // Build the context object that route handlers use to send responses.
  // This keeps handlers decoupled from the raw Node.js res object.
  const ctx = {
    url,
    requestId,
    sendJson: (code, payload) => sendJson(res, code, payload),
    sendError: (code, errCode, msg, details) => sendError(res, code, requestId, errCode, msg, details),
  };

  await route.handler(body, ctx);
}

const server = createServer((req, res) => {
  handleRequest(req, res).catch(() => {
    const requestId = randomUUID();
    // Keep the outer catch narrow and consistent so unexpected crashes still
    // come back as JSON instead of dropping the connection.
    sendError(res, 500, requestId, 'INTERNAL_ERROR', 'Unexpected server error.');
  });
});

server.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`API skeleton listening on http://localhost:${PORT}`);
});
