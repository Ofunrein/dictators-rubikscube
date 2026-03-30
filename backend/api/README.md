# API Scaffold (Sprint 2)

This folder contains the first API-integration scaffold so frontend can wire against a stable backend contract before full backend implementation lands.

## What is included

1. `openapi.yaml` (OpenAPI 3.1 contract with request/response/error schemas and examples)
2. Example payloads for every endpoint (embedded in `components.examples` and referenced from operations)
3. Spec-driven mock server (`src/mockServer.js`)
4. Validation skeleton server with route handlers (`src/server.js`)

## Endpoints

- `GET /v1/health`
- `GET /v1/cube/state/solved`
- `POST /v1/cube/moves/apply`
- `POST /v1/cube/scramble`
- `POST /v1/cube/solve` (mocked response shape)

## Run

```bash
cd backend/api
npm run mock   # OpenAPI example server on :4010
npm run serve  # Validation + route skeleton server on :4011
```

From repo root you can also run API + frontend together:

```bash
npm run dev
```

Optional ports:

```bash
MOCK_PORT=5000 npm run mock
API_PORT=5001 npm run serve
```

## Notes

- `openapi.yaml` is stored in JSON-compatible YAML so it can be loaded directly by Node without extra parser dependencies.
- Move application and scramble state generation reuse the frontend move logic for contract parity during this scaffold phase.
