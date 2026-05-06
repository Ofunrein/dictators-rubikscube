# Rubik's API

This folder contains the contract-first backend for cube operations, solver orchestration, AI coaching, and persistence contracts.

## Runtime source of truth

The shipped local and Vercel API path is the lightweight route-table runtime:

- `src/server.js` for local development (`npm run serve`, root `npm run dev`)
- `src/routes.js` for cube operations, solver orchestration, and AI coach handlers
- `../../api/v1/[...path].js` for the Vercel serverless adapter

The Fastify + Prisma files are a separate persistence/auth MVP, not the default
runtime:

- `src/app.ts`
- `src/index.ts`
- `src/routes/auth.ts`
- `src/routes/cubeSessions.ts`
- `src/routes/solveRecords.ts`
- `prisma/schema.prisma`

Keep changes to the route-table runtime unless you are explicitly working on the
Postgres persistence MVP.

## What is actually live right now

These pieces are actively used by the current app:

- `frontend/`
  - active frontend the team is using now
- `backend/api/src/server.js`
  - active local dev API when you run `npm run dev`
- `backend/api/src/solvers/wasmSolver.js`
  - bridge from the Node API into the WASM solver bundle
- `api/solver.js`
  - generated Emscripten bundle that exposes the C++ solver to JavaScript
- `backend/src/cube/solver_bridge.cpp`
  - C++ bridge that exports `solveCube` / `solveCubeMoves`
- `backend/src/cube/CubeOperations.cpp`
  - where `CubeOperations::solve3x3(...)` is called from the bridge
- `api/v1/[...path].js`
  - active production/Vercel API route

## What is not the live app path

- `backend/api/src/mockServer.ts`
  - example/mock server only
- `backend/api/src/app.ts` and `backend/api/src/index.ts`
  - Fastify + Prisma persistence MVP, not the API started by the current scripts
- `frontend-legacy/`
  - older prototype, not the app started by root `npm run dev`
- `backend/build/`
  - generated build artifacts, can be recreated
- `backend/include/`
  - not part of the current live frontend + API solve path

## Exact Eric solver path

When the user presses **Solve** in the live simulator, the call chain is:

1. `frontend/src/pages/SimulatorPage.jsx`
2. `frontend/src/net/api.js`
3. `POST /api/v1/cube/solve`
4. `backend/api/src/server.js` in local dev, or `api/v1/[...path].js` on Vercel
5. `backend/api/src/solvers/wasmSolver.js`
6. `api/solver.js`
7. `backend/src/cube/solver_bridge.cpp`
8. `CubeOperations::solve3x3(...)`

That final C++ call is the key proof that Eric's solver code is the thing being used for the solved-state response.

## Stack

- Node HTTP route dispatcher for active local API
- Shared frontend cube model and move engine
- WASM/Python solver bridges
- Prisma/Postgres schema and auth route implementation files for persistence work
- OpenAPI contract and request validation helpers

## Endpoints

Cube routes:

- `GET /v1/health`
- `GET /v1/cube/state/solved`
- `POST /v1/cube/moves/apply`
- `POST /v1/cube/scramble`
- `POST /v1/cube/solve`

AI coach routes:

- `POST /v1/ai/help`
- `POST /v1/ai/move/validate`

Experimental Fastify/Prisma auth routes:

- `POST /v1/auth/register`
- `POST /v1/auth/login`
- `POST /v1/auth/refresh`
- `POST /v1/auth/logout`
- `GET /v1/auth/me`

Experimental Fastify/Prisma persistence routes:

- `GET/POST /v1/cube-sessions`
- `GET/PATCH /v1/cube-sessions/:id`
- `POST /v1/cube-sessions/:id/complete`
- `GET /v1/solve-records`
- `GET /v1/stats/summary`

## Local setup for active route-table API

```bash
npm install
npm run dev
```

The root `npm run dev` command starts the active frontend on `5400` and the
active route-table API on `5200`.

## Experimental Fastify/Prisma setup

Use these commands only when working on the Postgres persistence MVP:

```bash
cd backend/api
cp .env.example .env
npm install
npm run prisma:generate
npm run prisma:migrate
npm run build
```

## Contracts and schemas

- API contract: `openapi.yaml`
- Prisma schema: `prisma/schema.prisma`
- Initial migration: `prisma/migrations/20260415120000_init/migration.sql`

## Notes

- Move application and scramble state generation reuse the active `frontend/` move logic for contract parity.
- AI coach routes are exposed through the same `/v1` and `/api/v1` adapters as cube routes.
