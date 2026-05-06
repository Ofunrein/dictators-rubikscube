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
