# Rubik's API (Fastify + Prisma)

This folder contains the contract-first backend for auth, cube operations, and persistence.

## Stack

- Fastify + TypeScript
- Prisma ORM (Postgres)
- JWT access tokens + refresh session cookies
- Zod request validation

## Endpoints

Cube routes:

- `GET /v1/health`
- `GET /v1/cube/state/solved`
- `POST /v1/cube/moves/apply`
- `POST /v1/cube/scramble`
- `POST /v1/cube/solve`

Auth routes:

- `POST /v1/auth/register`
- `POST /v1/auth/login`
- `POST /v1/auth/refresh`
- `POST /v1/auth/logout`
- `GET /v1/auth/me`

Persistence routes:

- `GET/POST /v1/cube-sessions`
- `GET/PATCH /v1/cube-sessions/:id`
- `POST /v1/cube-sessions/:id/complete`
- `GET /v1/solve-records`
- `GET /v1/stats/summary`

## Local setup

```bash
cd backend/api
cp .env.example .env
npm install
npm run prisma:generate
npm run prisma:migrate
npm run serve
```

From repo root, run frontend + backend together:

```bash
npm run setup
npm run dev
```

## Contracts and schemas

- API contract: `openapi.yaml`
- Prisma schema: `prisma/schema.prisma`
- Initial migration: `prisma/migrations/20260415120000_init/migration.sql`
