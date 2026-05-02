/**
 * routes.test.js — Tests for API route handlers
 *
 * Calls handlers directly via the ROUTES table with a mock ctx object so no
 * HTTP server is needed. Covers validation rejections, the health endpoint,
 * the solved-state endpoint, the move-apply endpoint, and the "already solved"
 * fast-path in the solve endpoint (which avoids hitting any solver).
 *
 * Run with: npm test (from backend/api/)
 * Uses Node's built-in test runner (node:test).
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import { createSolvedState, applyMoveToState } from './cube.js';
import { ROUTES, SERVICE_NAME, VERSION } from './routes.js';

function findHandler(method, path) {
  const route = ROUTES.find((r) => r.method === method && r.path === path);
  if (!route) throw new Error(`No route found for ${method} ${path}`);
  return route.handler;
}

function makeCtx(urlString = 'http://localhost/v1/health') {
  const responses = [];
  const errors = [];
  return {
    url: new URL(urlString),
    requestId: 'test-req',
    sendJson(code, payload) { responses.push({ code, payload }); },
    sendError(code, errCode, msg, details) { errors.push({ code, errCode, msg, details }); },
    get lastResponse() { return responses[responses.length - 1]; },
    get lastError() { return errors[errors.length - 1]; },
    responses,
    errors,
  };
}

// ─── Route table ─────────────────────────────────────────────────────────────

test('ROUTES exports SERVICE_NAME and VERSION', () => {
  assert.equal(typeof SERVICE_NAME, 'string');
  assert.equal(typeof VERSION, 'string');
});

test('ROUTES has all 6 expected endpoints', () => {
  const expected = [
    ['GET', '/'],
    ['GET', '/v1/health'],
    ['GET', '/v1/cube/state/solved'],
    ['POST', '/v1/cube/moves/apply'],
    ['POST', '/v1/cube/scramble'],
    ['POST', '/v1/cube/solve'],
  ];
  for (const [method, path] of expected) {
    assert.ok(
      ROUTES.some((r) => r.method === method && r.path === path),
      `missing route: ${method} ${path}`,
    );
  }
});

// ─── GET /v1/health ───────────────────────────────────────────────────────────

test('GET /v1/health returns 200 with service info', async () => {
  const ctx = makeCtx('http://localhost/v1/health');
  await findHandler('GET', '/v1/health')({}, ctx);

  assert.equal(ctx.lastResponse.code, 200);
  assert.equal(ctx.lastResponse.payload.ok, true);
  assert.equal(ctx.lastResponse.payload.service, SERVICE_NAME);
  assert.equal(ctx.lastResponse.payload.version, VERSION);
  assert.ok(typeof ctx.lastResponse.payload.timestamp === 'string');
});

// ─── GET / ────────────────────────────────────────────────────────────────────

test('GET / returns 200 with welcome message', async () => {
  const ctx = makeCtx('http://localhost/');
  await findHandler('GET', '/')({}, ctx);

  assert.equal(ctx.lastResponse.code, 200);
  assert.equal(ctx.lastResponse.payload.ok, true);
});

// ─── GET /v1/cube/state/solved ────────────────────────────────────────────────

test('GET /v1/cube/state/solved defaults to 3x3', async () => {
  const ctx = makeCtx('http://localhost/v1/cube/state/solved');
  await findHandler('GET', '/v1/cube/state/solved')({}, ctx);

  assert.equal(ctx.lastResponse.code, 200);
  assert.equal(ctx.lastResponse.payload.size, 3);
  assert.deepEqual(ctx.lastResponse.payload.state, createSolvedState(3));
});

test('GET /v1/cube/state/solved returns 2x2 when ?size=2', async () => {
  const ctx = makeCtx('http://localhost/v1/cube/state/solved?size=2');
  await findHandler('GET', '/v1/cube/state/solved')({}, ctx);

  assert.equal(ctx.lastResponse.payload.size, 2);
  assert.deepEqual(ctx.lastResponse.payload.state, createSolvedState(2));
});

test('GET /v1/cube/state/solved returns 4x4 when ?size=4', async () => {
  const ctx = makeCtx('http://localhost/v1/cube/state/solved?size=4');
  await findHandler('GET', '/v1/cube/state/solved')({}, ctx);

  assert.equal(ctx.lastResponse.payload.size, 4);
  assert.deepEqual(ctx.lastResponse.payload.state, createSolvedState(4));
});

test('GET /v1/cube/state/solved sends 400 for invalid size', async () => {
  const ctx = makeCtx('http://localhost/v1/cube/state/solved?size=9');
  await findHandler('GET', '/v1/cube/state/solved')({}, ctx);

  assert.equal(ctx.lastError.code, 400);
});

// ─── POST /v1/cube/moves/apply ────────────────────────────────────────────────

test('POST /v1/cube/moves/apply applies a move and returns the new state', async () => {
  const state = createSolvedState(3);
  const ctx = makeCtx('http://localhost/v1/cube/moves/apply');
  await findHandler('POST', '/v1/cube/moves/apply')({ size: 3, state, move: 'R' }, ctx);

  assert.equal(ctx.lastResponse.code, 200);
  assert.equal(ctx.lastResponse.payload.appliedMove, 'R');
  assert.deepEqual(ctx.lastResponse.payload.state, applyMoveToState(state, 'R'));
});

test('POST /v1/cube/moves/apply sends 400 for missing move', async () => {
  const ctx = makeCtx('http://localhost/v1/cube/moves/apply');
  await findHandler('POST', '/v1/cube/moves/apply')(
    { size: 3, state: createSolvedState(3) },
    ctx,
  );

  assert.equal(ctx.lastError.code, 400);
  assert.equal(ctx.lastError.errCode, 'VALIDATION_ERROR');
});

test('POST /v1/cube/moves/apply sends 400 for invalid move for size', async () => {
  const ctx = makeCtx('http://localhost/v1/cube/moves/apply');
  await findHandler('POST', '/v1/cube/moves/apply')(
    { size: 2, state: createSolvedState(2), move: 'M' },
    ctx,
  );

  assert.equal(ctx.lastError.code, 400);
});

test('POST /v1/cube/moves/apply sends 400 for missing size', async () => {
  const ctx = makeCtx('http://localhost/v1/cube/moves/apply');
  await findHandler('POST', '/v1/cube/moves/apply')(
    { state: createSolvedState(3), move: 'R' },
    ctx,
  );

  assert.equal(ctx.lastError.code, 400);
});

// ─── POST /v1/cube/solve (already-solved fast path) ──────────────────────────

test('POST /v1/cube/solve returns empty moves for an already-solved cube', async () => {
  const ctx = makeCtx('http://localhost/v1/cube/solve');
  await findHandler('POST', '/v1/cube/solve')(
    { size: 3, state: createSolvedState(3) },
    ctx,
  );

  assert.equal(ctx.lastResponse.code, 200);
  assert.deepEqual(ctx.lastResponse.payload.moves, []);
  assert.equal(ctx.lastResponse.payload.estimatedMoveCount, 0);
});

test('POST /v1/cube/solve sends 400 for missing state', async () => {
  const ctx = makeCtx('http://localhost/v1/cube/solve');
  await findHandler('POST', '/v1/cube/solve')({ size: 3 }, ctx);

  assert.equal(ctx.lastError.code, 400);
  assert.equal(ctx.lastError.errCode, 'VALIDATION_ERROR');
});

test('POST /v1/cube/solve sends 400 for invalid strategy', async () => {
  const ctx = makeCtx('http://localhost/v1/cube/solve');
  await findHandler('POST', '/v1/cube/solve')(
    { size: 3, state: createSolvedState(3), strategy: 'unknown' },
    ctx,
  );

  assert.equal(ctx.lastError.code, 400);
});

// ─── POST /v1/cube/scramble (validation only) ────────────────────────────────

test('POST /v1/cube/scramble sends 400 for missing size', async () => {
  const ctx = makeCtx('http://localhost/v1/cube/scramble');
  await findHandler('POST', '/v1/cube/scramble')({}, ctx);

  assert.equal(ctx.lastError.code, 400);
  assert.equal(ctx.lastError.errCode, 'VALIDATION_ERROR');
});

test('POST /v1/cube/scramble sends 400 for out-of-range length', async () => {
  const ctx = makeCtx('http://localhost/v1/cube/scramble');
  await findHandler('POST', '/v1/cube/scramble')({ size: 3, length: 200 }, ctx);

  assert.equal(ctx.lastError.code, 400);
});
