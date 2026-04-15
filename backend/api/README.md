# API Scaffold (Sprint 2)

This folder contains the first API-integration scaffold so frontend can wire against a stable backend contract before full backend implementation lands.

## What is actually live right now

These pieces are actively used by the current app:

- `dictators-website/`
  - active frontend the team is using now
- `backend/api/src/server.js`
  - active local dev API when you run `npm run dev`
- `backend/api/src/wasmSolver.js`
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

- `backend/api/src/mockServer.js`
  - example/mock server only
- `frontend/`
  - older prototype, not the app started by root `npm run dev`
- `backend/build/`
  - generated build artifacts, can be recreated
- `backend/include/`
  - not part of the current live frontend + API solve path

## Exact Eric solver path

When the user presses **Solve** in the live simulator, the call chain is:

1. `dictators-website/src/pages/SimulatorPage.jsx`
2. `dictators-website/src/net/api.js`
3. `POST /api/v1/cube/solve`
4. `backend/api/src/server.js` in local dev, or `api/v1/[...path].js` on Vercel
5. `backend/api/src/wasmSolver.js`
6. `api/solver.js`
7. `backend/src/cube/solver_bridge.cpp`
8. `CubeOperations::solve3x3(...)`

That final C++ call is the key proof that Eric's solver code is the thing being used for the solved-state response.

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
npm run serve  # Validation + route skeleton server on :5200
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
- Move application and scramble state generation reuse the `dicators-website` move logic for contract parity during this scaffold phase.
