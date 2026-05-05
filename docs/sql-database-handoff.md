# SQL Database Handoff (Postgres + Auth MVP)

## Owner Transfer

- **Current implementation branch:** `codex/ticket-postgres-auth-mvp`
- **Head commit:** `b3b2eb3`
- **Base branch:** `main`
- **PR link to open/review:**
  `https://bitbucket.org/txstate-cs3398-spring26-r02-team5/the-dictators/pull-requests/new?source=codex/ticket-postgres-auth-mvp&t=1`

This branch contains the SQL/Postgres + auth/session persistence MVP and is ready for scrum-master ownership.

## What Is Implemented

### Backend (`backend/api`)
- Migrated API from Node HTTP scaffold to **Fastify + TypeScript**.
- Added **Prisma + Postgres** setup:
  - `prisma/schema.prisma`
  - initial migration for `users`, `user_credentials`, `auth_sessions`, `cube_sessions`, `solve_records`
  - unique constraints on `email` and `username`
- Added auth/security internals:
  - Argon2 password hashing/verification
  - JWT access token creation/verification
  - refresh token hash storage, rotation, revocation, HttpOnly cookie flow
- Added endpoints:
  - `POST /v1/auth/register`
  - `POST /v1/auth/login`
  - `POST /v1/auth/refresh`
  - `POST /v1/auth/logout`
  - `GET /v1/auth/me`
  - `GET/POST /v1/cube-sessions`
  - `GET/PATCH /v1/cube-sessions/:id`
  - `POST /v1/cube-sessions/:id/complete`
  - `GET /v1/solve-records`
  - `GET /v1/stats/summary`
- Preserved cube routes and contract behavior:
  - `GET /v1/health`
  - `GET /v1/cube/state/solved`
  - `POST /v1/cube/moves/apply`
  - `POST /v1/cube/scramble`
  - `POST /v1/cube/solve`
- Updated OpenAPI in `backend/api/openapi.yaml`.
- Added local compatibility for both prefixes:
  - `/v1/*`
  - `/api/v1/*`

### Frontend Transport (`dictators-website`)
- Extended `src/net/api.js` with:
  - auth calls (`register/login/refresh/logout/me`)
  - session/stat/history calls (`cube-sessions`, `solve-records`, `stats/summary`)
  - bearer auth + one-time retry after successful refresh on `401`
- Added `src/net/authSession.js` for in-memory access-token/user state.
- Added auth bootstrap call in `src/main.jsx`.
- Added Vite dev proxy for `/api` to backend (`src/vite.config.js`).

## Validation Status

Executed and passing on this branch:

```bash
npm --prefix backend/api test
npm --prefix backend/api run build
npm --prefix dictators-website run build
```

## What Scrum Master Should Do Next

1. Check out branch:
   ```bash
   git fetch origin
   git switch codex/ticket-postgres-auth-mvp
   ```
2. Create backend env:
   ```bash
   cp backend/api/.env.example backend/api/.env
   ```
3. Ensure Postgres is running and `DATABASE_URL` is correct in `backend/api/.env`.
4. Run Prisma setup:
   ```bash
   npm --prefix backend/api run prisma:generate
   npm --prefix backend/api run prisma:migrate
   ```
5. Run local stack:
   ```bash
   npm run setup
   npm run dev
   ```
6. Run API test pass again:
   ```bash
   npm --prefix backend/api test
   ```
7. Open PR from `codex/ticket-postgres-auth-mvp` to `main`, assign to scrum master, and continue SQL/database ownership there.

## Notes for Scope

- This handoff is **MVP SQL/auth/session transport**, not final auth UI pages.
- Remaining AI/ML work can proceed separately without blocking this branch.
