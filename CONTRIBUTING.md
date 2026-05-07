# Contributing

## Setup

```bash
# Backend (port 5200)
cd backend/api && npm install && npm run dev

# Frontend (port 5400, separate terminal)
cd frontend && npm install && npm run dev
```

Copy `backend/api/.env.example` to `backend/api/.env` and fill in the required values before starting the backend.

## Tests

Run before every commit:

```bash
# Backend
cd backend/api && npm run test:ts

# Frontend
cd frontend && npm test
```

CI runs both suites on every push and PR.

## Branches

Use plain descriptive names: `feature/x`, `fix/y`, `docs/z`. No AI-tool prefixes.

## Commits

Follow Conventional Commits: `feat:`, `fix:`, `chore:`, `docs:`, `test:`, `refactor:`.

## Code Style

- Frontend: React JSX, Tailwind utility classes, custom hooks for business logic
- Backend: TypeScript strict mode, Zod validation, Fastify routing
- Run `npm run lint` in `frontend/` before committing UI changes

## TypeScript

All frontend source files are `.tsx`/`.ts` with strict mode. When adding new files:
- Use `.tsx` for React components, `.ts` for utilities/hooks
- Run `npx tsc --noEmit` in `frontend/` before committing
- Avoid `any` — use `unknown` with type guards instead
- `@typescript-eslint/no-explicit-any` is configured as a warning

## API Reference

Full OpenAPI 3.0 specification: [`backend/api/openapi.yaml`](./backend/api/openapi.yaml)

Import into [Swagger Editor](https://editor.swagger.io/) for interactive exploration.
